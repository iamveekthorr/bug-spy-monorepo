import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Controller, useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import DashboardImage from '@/assets/dashboard.png';
import DownloadCard from '@/assets/download-card.png';
import BackgroundImage from '@/assets/99faf793ab4bd9f418a92e270a2fb359015560d9.jpg';
import ErrorCat from '@/assets/error-category.png';
import ScheduleTest from '@/assets/schedule-tests.png';
import ShareableReports from '@/assets/share-report.png';
import ScreenShots from '@/assets/test-completed.png';
import DashboardScreenshot from '@/assets/dashboard-screenshot.png';

import {
  Settings,
  NetworkIcon,
  ChartLineIcon,
  Shield,
  Download,
  XIcon,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectValue,
  SelectItem,
  SelectTrigger,
  SelectLabel,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';

import Homepage from '@/components/layout/Homepage.layout';
import PlatformCard from '@/components/home/PlatformCard.home';
import HowItWorksCard from '@/components/home/HowItWorksCard.home';
import Modal from '@/components/Modal';

import {
  STATUS_LABELS,
  type ResultData,
  type SSEEvent,
} from '@/utils/handleSSE.util';
import SvgIcon from './svg-icon-component/svg-icon.component';
import { Link } from 'react-router-dom';
import { useUIStore } from '@/store';
import {
  Table,
  TableBody,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

const REGEX_PATTERN = /([\w-]+\.)+[\w-]+(\/[\w-]*)*$/gm;

const schema = z.object({
  url: z.string().regex(REGEX_PATTERN),
  testType: z.optional(z.string()),
  deviceType: z.optional(z.string()),
});

type InputData = z.infer<typeof schema>;

const normalizeUrl = (input: string): string => {
  let url = input.trim();

  // 1. Add protocol if missing
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    // 2. If hostname has no dot AND is not localhost or an IP
    const isLocalhost = hostname === 'localhost';
    const isIP = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);

    if (!hostname.includes('.') && !isLocalhost && !isIP) {
      parsed.hostname = `${hostname}.com`;
    }

    return parsed.toString();
  } catch {
    throw new Error('Invalid URL');
  }
};

const Index = () => {
  const { openSignupModal } = useUIStore();
  const form = useForm<InputData>({
    defaultValues: {
      url: '',
      testType: '',
      deviceType: '',
    },
    resolver: zodResolver(schema),
  });

  const [open, toggleOpen] = useState(false);

  // define regex pattern

  // TODO: - Taks left before moving to homepage
  // Get the strings from the input fields
  // Validate them - 1) url (regex), prefix the url with 'http://'
  // 2) Validate test type
  // 3) Make button disabled when it's page is loading
  // 4) display result in the modal

  const [, setTimeline] = useState<SSEEvent[]>([]);
  const [status, setStatus] = useState();
  const [results, setResults] = useState<Record<string, unknown> | null>(null);

  const handleEvent = (event: ResultData) => {
    setTimeline((prev) => [...prev, event]);

    if (event.status === 'COMPLETE') {
      setResults(event.results);

      console.log(event);
    }
  };

  const onSubmit: SubmitHandler<InputData> = (data: InputData) => {
    toggleOpen((prev) => !prev);
    const normalizedUrl = normalizeUrl(data.url);

    const url = new URL('http://localhost:3000/api/v1/capture-metrics/single');

    url.searchParams.set('url', normalizedUrl);

    // validate that the given url has http prefix and has a tld domain attached
    const source = new EventSource(url);

    source.onmessage = (event: MessageEvent) => {
      const parsed = JSON.parse(event.data);
      setStatus(parsed.data.status);
      console.log(parsed.data);

      const sseEvent: ResultData = {
        ...parsed.data,
        timestamp: Date.now(),
      };

      handleEvent(sseEvent);
    };

    source.onerror = (event: Event) => {
      console.log((event as MessageEvent).data);
      source.close();
    };
  };

  const transformStatus = (status: string) => {
    return status.replaceAll('_', ' ');
  };
  return (
    <Homepage>
      <Modal isOpen={open} onClose={() => toggleOpen((prev) => !prev)}>
        <div className="grid place-items-center fixed inset-0 m-auto p-4">
          {status !== 'COMPLETE' ? (
            <div className="grid place-items-center text-center text-white max-w-lg mx-auto">
              <div className="mb-6 md:mb-10">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-5">
                  Performing BugSpy Magic...
                </h2>
                <p className="mb-3 md:mb-5 text-sm md:text-base">
                  {status
                    ? (STATUS_LABELS[status] ?? transformStatus(status))
                    : 'Waiting to start...'}
                </p>
                <div className="flex gap-2 md:gap-3 justify-center items-center">
                  <Shield size={20} className="md:w-6 md:h-6" />
                  <p className="text-sm md:text-base">SECURE DATA PROCESSING</p>
                </div>
              </div>
              <p className="rounded-md border-white bg-blue-400/10 border p-3 md:p-5 text-xs md:text-sm max-w-md">
                Note: Do not refresh, close or click back button in this page.
                Your result may be lost.
              </p>
            </div>
          ) : (
            <div className="bg-white p-4 md:p-6 lg:p-10 rounded-sm w-full max-w-[90vw] md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-end mb-4 hover:cursor-pointer">
                <Button
                  variant={'ghost'}
                  onClick={() => toggleOpen((prev) => !prev)}
                  size="sm"
                >
                  <XIcon size={20} />
                </Button>
              </div>
              <div className="grid place-items-center">
                <div className="bg-blue-700/5 p-2 grid place-items-center rounded-xl mb-4">
                  <SvgIcon iconName="game-icons_test-tube-held" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-2 text-center">
                  Test Completed!
                </h3>
                <p className="text-neutral-700 text-sm md:text-base text-center mb-4">
                  Your website performance report for {form.getValues('url')} is
                  ready
                </p>
                <div className="my-5 w-full rounded-sm">
                  <div className="h-40 md:h-60">
                    <div className="px-3 md:px-5 py-3 after:absolute h-full after:bg-black/50 after:inset-0 relative after:block bg-white">
                      <p className="capitalize text-sm md:text-base">
                        performance summary
                      </p>
                      <Table className="text-xs md:text-sm bg-blue-700/5 my-3 md:my-5">
                        <TableCaption className="text-xs">
                          {results &&
                            results.webMetrics?.opportunities?.[0]?.description}
                        </TableCaption>
                        <TableHeader className="capitalize">
                          <TableRow>
                            <TableHead className="text-xs md:text-sm">
                              metric
                            </TableHead>
                            <TableHead className="text-xs md:text-sm">
                              value
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody></TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 align-center">
                <Link
                  to={{
                    pathname: '/dashboard/reports',
                    search: `?url=${form.getValues('url')}`,
                  }}
                  className="w-full sm:mr-5"
                >
                  <Button
                    className="capitalize w-full bg-blue-600 text-white text-sm"
                    variant={'link'}
                  >
                    view full report
                  </Button>
                </Link>
                <Button
                  variant={'outline'}
                  title="download"
                  className="w-full sm:w-auto"
                  size="sm"
                >
                  <Download size={16} />
                  <span className="ml-2 sm:hidden">Download</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <section
        className={cn('container m-auto pt-[32px] px-4 md:px-8 lg:px-[75px]')}
      >
        <div className={cn('flex justify-center flex-col items-center')}>
          <h1
            className={cn(
              'text-2xl md:text-3xl lg:text-[48px] font-bold w-full md:w-4/5 text-center mb-6 md:mb-10 leading-tight',
            )}
          >
            <span className="block">
              Automated Website{' '}
              <span className={cn('text-blue-600')}>Testing.</span> Faster.
            </span>
            <span className="block">Smarter. Better.</span>
          </h1>

          <div className="text-center w-full max-w-4xl">
            <h2 className={cn('capitalize mb-2 font-bold text-lg md:text-xl')}>
              Run a Free Website Test Instantly
            </h2>

            <p
              className={cn(
                'mb-6 text-sm md:text-base max-w-2xl mx-auto text-gray-600',
              )}
            >
              Enter any website URL to check performance, detect errors, and
              preview what BugSpy can do.
            </p>

            <form
              className="flex flex-col md:flex-row gap-3 justify-center items-start mb-8 max-w-6xl mx-auto"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              {/* Main URL Input Section */}
              <div className="flex-[2] w-full md:w-auto">
                <Controller
                  name="url"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="w-full">
                      <Input
                        {...field}
                        type="text"
                        placeholder="https://example.com"
                        className={cn(
                          'h-12 text-base px-4 bg-white border border-gray-300 rounded-lg',
                          'focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all',
                          'hover:border-gray-400 placeholder:text-gray-400',
                          fieldState.invalid &&
                            'border-red-300 focus:border-red-500 focus:ring-red-100',
                        )}
                        id="url"
                        name="url_input"
                      />
                      {fieldState.error && (
                        <p className="text-red-500 text-sm mt-1 ml-1">
                          {fieldState.error.message}
                        </p>
                      )}
                    </Field>
                  )}
                />
              </div>

              {/* Quick Free Test Dropdown */}
              <div className="w-full md:w-auto md:min-w-[180px]">
                <Controller
                  name="testType"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="w-full">
                      <Select
                        {...field}
                        name="testType"
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="testType"
                          className={cn(
                            '!h-12 text-base px-4 bg-white border border-gray-300 rounded-lg',
                            'focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all',
                            'hover:border-gray-400',
                            fieldState.invalid &&
                              'border-red-300 focus:border-red-500 focus:ring-red-100',
                          )}
                        >
                          <SelectValue placeholder="Quick Free Test" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg border shadow-lg">
                          <SelectGroup>
                            <SelectItem
                              value="performance"
                              className="px-3 py-2 text-base hover:bg-blue-50 rounded-md"
                            >
                              Performance Test
                            </SelectItem>
                            <SelectItem
                              value="security"
                              className="px-3 py-2 text-base hover:bg-blue-50 rounded-md"
                            >
                              Security Test
                            </SelectItem>
                            <SelectItem
                              value="seo"
                              className="px-3 py-2 text-base hover:bg-blue-50 rounded-md"
                            >
                              SEO Test
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
              </div>

              {/* Device Type Dropdown */}
              <div className="w-full md:w-auto md:min-w-[180px]">
                <Controller
                  name="deviceType"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="w-full">
                      <Select
                        {...field}
                        name="deviceType"
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="deviceType"
                          className={cn(
                            '!h-12 text-base px-4 bg-white border border-gray-300 rounded-lg',
                            'focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all',
                            'hover:border-gray-400',
                            fieldState.invalid &&
                              'border-red-300 focus:border-red-500 focus:ring-red-100',
                          )}
                        >
                          <SelectValue placeholder="Desktop" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg border shadow-lg">
                          <SelectGroup>
                            <SelectItem
                              value="desktop"
                              className="px-3 py-2 text-base hover:bg-blue-50 rounded-md"
                            >
                              Desktop
                            </SelectItem>
                            <SelectItem
                              value="tablet"
                              className="px-3 py-2 text-base hover:bg-blue-50 rounded-md"
                            >
                              Tablet
                            </SelectItem>
                            <SelectItem
                              value="mobile"
                              className="px-3 py-2 text-base hover:bg-blue-50 rounded-md"
                            >
                              Mobile
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
              </div>

              {/* Start Test Button */}
              <div className="w-full md:w-auto">
                <Button
                  size={null}
                  variant={null}
                  className={cn(
                    '!h-12 !min-h-[48px] !max-h-[48px] !leading-[48px] px-8 text-base font-semibold rounded-lg w-full md:w-auto',
                    'bg-blue-600 hover:bg-blue-700 text-white !py-0',
                    'transition-all duration-200 inline-flex items-center justify-center',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                  type="submit"
                >
                  Start Test
                </Button>
              </div>
            </form>

            <div className={cn('relative max-w-5xl mx-auto mt-8 md:mt-12')}>
              <div className={cn('w-full')}>
                <img
                  src={DashboardImage}
                  alt="BugSpy Dashboard"
                  className="w-full h-auto rounded-lg shadow-2xl"
                />
              </div>
              <div
                className={cn(
                  'absolute top-4 md:top-8 -left-2 md:-left-5 w-[200px] md:w-[311px] h-[180px] md:h-[282px] hidden sm:block',
                )}
              >
                <img
                  src={DownloadCard}
                  alt="Download feature card"
                  className={cn(
                    'w-full h-full object-cover rounded-md shadow-lg',
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="relative text-white">
        <div
          className={cn(
            'relative after:absolute after:bg-black/70 after:inset-0 ',
            "after:content-[''] h-[781px]",
          )}
        >
          <img
            src={BackgroundImage}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>

        <div className="absolute inset-0 flex items-center">
          <div className={cn('container m-auto px-4 md:px-8 lg:px-[75px]')}>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
              What is BugSpy?
            </h2>
            <p className="font-normal w-full max-w-[650px] mt-4 md:mt-7 text-sm md:text-base leading-relaxed">
              BugSpy is a web-based platform that automates website testing to
              help developers, QA teams, and businesses deliver flawless digital
              experiences. With advanced browser automation, BugSpy detects UI
              glitches, console and network errors, captures full-page
              screenshots, and measures real performance metrics all in real
              time.
            </p>

            <div className="flex flex-col lg:flex-row justify-between gap-4 md:gap-6 lg:gap-5 mt-6 md:mt-8 lg:mt-12">
              <PlatformCard>
                <div className="flex justify-center mb-3 md:mb-5">
                  <div className="bg-white/10 p-2 md:p-3 rounded-sm">
                    <Settings size={20} className="md:w-6 md:h-6" />
                  </div>
                </div>
                <h3 className="font-bold text-sm md:text-base mb-2">
                  Easy Automated Testing:
                </h3>
                <p className="text-xs md:text-sm">
                  Run instant or scheduled tests without setup.
                </p>
              </PlatformCard>
              <PlatformCard>
                <div className="flex justify-center mb-3 md:mb-5">
                  <div className="bg-white/10 p-2 md:p-3 rounded-sm">
                    <ChartLineIcon size={20} className="md:w-6 md:h-6" />
                  </div>
                </div>

                <h3 className="font-bold text-sm md:text-base mb-2">
                  Actionable Insights:
                </h3>
                <p className="text-xs md:text-sm">
                  Categorized error reports, performance scores, and exports.
                </p>
              </PlatformCard>
              <PlatformCard>
                <div className="flex justify-center mb-3 md:mb-5">
                  <div className="bg-white/10 p-2 md:p-3 rounded-sm">
                    <NetworkIcon size={20} className="md:w-6 md:h-6" />
                  </div>
                </div>

                <h3 className="font-bold text-sm md:text-base mb-2">
                  Scalable for Teams:
                </h3>
                <p className="text-xs md:text-sm">
                  From freelancers to enterprise QA, BugSpy grows with you
                </p>
              </PlatformCard>
            </div>
          </div>
        </div>
      </section>
      <section>
        <section
          className={cn(
            'container m-auto pt-[32px] px-4 md:px-8 lg:px-[75px] mt-10',
          )}
        >
          <div className="flex justify-center flex-col text-center mb-12 md:mb-20">
            <h2 className="text-2xl md:text-3xl lg:text-4xl capitalize font-bold mb-3">
              features overview
            </h2>
            <p className="text-sm md:text-base max-w-2xl mx-auto">
              Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
              vulputate libero
            </p>
          </div>

          {/* Feature 1: Error Categorization */}
          <div className="flex flex-col lg:flex-row mt-6 md:mt-10 mb-6 md:mb-10 items-center py-8 md:py-12 lg:py-20 gap-6 lg:gap-12">
            <div className="w-full lg:w-1/2 order-2 lg:order-1">
              <h3 className="text-xl md:text-2xl font-bold mb-3 text-center lg:text-left">
                Error Categorization
              </h3>
              <p className="text-black/70 text-sm md:text-base leading-relaxed text-center lg:text-left">
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
              </p>
            </div>
            <div className="w-full lg:w-1/2 max-w-[500px] lg:max-w-[650px] h-[250px] md:h-[350px] border overflow-hidden rounded-sm shadow-xl order-1 lg:order-2">
              <img
                src={ErrorCat}
                alt="Error categorization feature"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Feature 2: Full-page Screenshots */}
          <div className="flex flex-col lg:flex-row mt-6 md:mt-10 mb-6 md:mb-10 items-center py-8 md:py-12 lg:py-20 gap-6 lg:gap-12">
            <div className="w-full lg:w-1/2 max-w-[500px] lg:max-w-[650px] h-[250px] md:h-[350px] border overflow-hidden rounded-sm shadow-xl order-1">
              <img
                src={ScreenShots}
                alt="Full-page screenshots feature"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-full lg:w-1/2 order-2">
              <h3 className="text-xl md:text-2xl font-bold mb-3 text-center lg:text-left">
                Full-page Screenshots.
              </h3>
              <p className="text-black/70 text-sm md:text-base leading-relaxed text-center lg:text-left">
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
              </p>
            </div>
          </div>

          {/* Feature 3: Exportable Reports */}
          <div className="flex flex-col lg:flex-row mt-6 md:mt-10 mb-6 md:mb-10 items-center py-8 md:py-12 lg:py-20 gap-6 lg:gap-12">
            <div className="w-full lg:w-1/2 order-2 lg:order-1">
              <h3 className="text-xl md:text-2xl font-bold mb-3 text-center lg:text-left">
                Exportable Reports.
              </h3>
              <p className="text-black/70 text-sm md:text-base leading-relaxed text-center lg:text-left">
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
              </p>
            </div>
            <div className="w-full lg:w-1/2 max-w-[500px] lg:max-w-[650px] h-[250px] md:h-[350px] border overflow-hidden rounded-sm shadow-xl order-1 lg:order-2">
              <img
                src={ShareableReports}
                alt="Exportable reports feature"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Feature 4: Scheduled Tests */}
          <div className="flex flex-col lg:flex-row mt-6 md:mt-10 mb-6 md:mb-10 items-center py-8 md:py-12 lg:py-20 gap-6 lg:gap-12">
            <div className="w-full lg:w-1/2 max-w-[500px] lg:max-w-[650px] h-[250px] md:h-[350px] border overflow-hidden rounded-sm shadow-xl order-1">
              <img
                src={ScheduleTest}
                alt="Scheduled tests feature"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-full lg:w-1/2 order-2">
              <h3 className="text-xl md:text-2xl font-bold mb-3 text-center lg:text-left">
                Scheduled tests & history (Pro+)
              </h3>
              <p className="text-black/70 text-sm md:text-base leading-relaxed text-center lg:text-left">
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
              </p>
            </div>
          </div>
        </section>
      </section>
      <section className="bg-slate-900 text-white">
        <section
          className={cn(
            'container m-auto py-8 md:py-12 lg:py-[50px] px-4 md:px-8 lg:px-[75px] mt-10',
          )}
        >
          <div className="text-center mb-8 md:mb-12 lg:mb-16">
            <h3 className="capitalize font-bold text-2xl md:text-3xl lg:text-4xl">
              how bugspy works
            </h3>
            <p className="mt-3 text-sm md:text-base max-w-2xl mx-auto">
              Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
              vulputate libero
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8 place-items-center mt-6 md:mt-8 lg:mt-10">
            <HowItWorksCard
              image={ScheduleTest}
              digit="01"
              title="Enter a website URL"
              subTitle="(UI, console, network, performance)."
              altText="Step 1: Enter website URL"
            />

            <HowItWorksCard
              image={ScheduleTest}
              digit="02"
              title="Run automated tests"
              subTitle="BugSpy performs comprehensive analysis."
              altText="Step 2: Run automated tests"
            />
            <HowItWorksCard
              image={ScheduleTest}
              digit="03"
              title="Review detailed results"
              subTitle="Get categorized errors and insights."
              altText="Step 3: Review detailed results"
            />
            <HowItWorksCard
              image={ScheduleTest}
              digit="04"
              title="Export and share reports"
              subTitle="Download or share your findings."
              altText="Step 4: Export and share reports"
            />
          </div>
        </section>
      </section>

      <section
        className={cn(
          'container m-auto py-8 md:py-12 lg:py-[50px] px-4 md:px-8 lg:px-[75px] mt-10',
        )}
      >
        <div className="bg-blue-600 overflow-hidden rounded-xl flex flex-col lg:flex-row p-6 md:p-8 lg:ps-10 lg:pr-0 min-h-[400px] lg:h-90 text-white items-center lg:items-start relative">
          <div className="w-full lg:w-1/2 z-10 text-center lg:text-left mb-6 lg:mb-0">
            <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold leading-tight">
              <span className="block mb-1 md:mb-2">Sign up to unlock </span>
              <span className="block">full details</span>
            </h2>
            <p className="my-3 md:my-4 text-sm md:text-base max-w-lg mx-auto lg:mx-0">
              Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
              vulputate libero et velit interdum.
            </p>
            <Button
              onClick={openSignupModal}
              className="bg-white text-black/70 px-6 md:px-8 lg:px-10 py-3 md:py-4 lg:py-5 font-semibold hover:bg-gray-100 transition-colors"
            >
              Sign up
            </Button>
          </div>
          <div className="absolute bottom-0 top-0 right-0 lg:top-8 w-full lg:w-1/2 opacity-20 lg:opacity-100 isolate">
            <img
              src={DashboardScreenshot}
              alt="BugSpy Dashboard Preview"
              className="w-full h-full object-cover object-left"
            />
          </div>
        </div>
      </section>
    </Homepage>
  );
};

export default Index;
