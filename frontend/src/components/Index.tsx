import { cn } from '@/lib/utils';

import DashboardImage from '@/assets/dashboard.png';
import DownloadCard from '@/assets/download-card.png';
import BackgroundImage from '@/assets/99faf793ab4bd9f418a92e270a2fb359015560d9.jpg';
import ErrorCat from '@/assets/error-category.png';
import ScheduleTest from '@/assets/schedule-tests.png';
import ShareableReports from '@/assets/share-report.png';
import ScreenShots from '@/assets/test-completed.png';

import { Settings, NetworkIcon, ChartLineIcon } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectValue,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

import Homepage from '@/components/layout/Homepage.layout';
import PlatformCard from '@/components/home/PlatformCard.home';
import HowItWorksCard from './home/HowItWorksCard.home';

const Index = () => {
  return (
    <Homepage>
      <section className={cn('container m-auto pt-[32px] px-[75px]')}>
        <div className={cn('flex justify-center flex-col items-center')}>
          <h1
            className={cn(
              'capitalize text-[48px] font-bold w-4/5 text-center mb-10',
            )}
          >
            automated website{' '}
            <span className={cn('text-blue-600 capitalize')}>Testing.</span>
            Faster.smarter.better.
          </h1>

          <div className="text-center">
            <h2 className={cn('capitalize mb-2 font-bold')}>
              run <span>a</span> free website test instantly
            </h2>

            <p className={cn('mb-5')}>
              Enter any website URL to check performance, detect errors, and
              preview what BugSpy can do.
            </p>

            <div className="flex justify-center gap-3 mb-5 items-stretch">
              <div className={cn('w-2/5 h-[48px]')}>
                <Input
                  type="text"
                  placeholder="https://example.com"
                  className={cn('h-[100%]')}
                  id="url"
                  name="url_input"
                />
              </div>
              <div className={cn('gap-3 flex')}>
                <Select>
                  <SelectTrigger className={cn('w-[180px] h-[100%]!')}>
                    <SelectValue placeholder="quick test" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="item 1">item 1</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Button className={cn('h-[100%]!')}>start test</Button>
              </div>
            </div>

            <div className={cn('relative')}>
              <div className={cn()}>
                <img src={DashboardImage} alt="" />
              </div>
              <div
                className={cn('absolute top-30 -left-5 w-[311px] h-[282px]')}
              >
                <img
                  src={DownloadCard}
                  alt=""
                  className={cn('height-[100%] width-[100%]')}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="relative text-white">
        <div
          className={cn(
            'relative after:absolute after:bg-black/70 after:z-10 after:inset-0 ',
            "after:content-[''] h-[781px]",
          )}
        >
          <img
            src={BackgroundImage}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>

        <div className="absolute isolate z-20 inset-50">
          <div className={cn('container m-auto')}>
            <h2 className="text-3xl font-bold">What is BugSpy?</h2>
            <p className="font-normal w-[650px] mt-7">
              BugSpy is a web-based platform that automates website testing to
              help developers, QA teams, and businesses deliver flawless digital
              experiences. With advanced browser automation, BugSpy detects UI
              glitches, console and network errors, captures full-page
              screenshots, and measures real performance metrics all in real
              time.
            </p>

            <div className="flex justify-between gap-5 mt-7">
              <PlatformCard>
                <div className="flex justify-center mb-5">
                  <div className="bg-white/10 p-3 rounded-sm">
                    <Settings />
                  </div>
                </div>
                <h3>Easy Automated Testing:</h3>
                <p>Run instant or scheduled tests without setup.</p>
              </PlatformCard>
              <PlatformCard>
                <div className="flex justify-center mb-5">
                  <div className="bg-white/10 p-3 rounded-sm">
                    <ChartLineIcon />
                  </div>
                </div>

                <h3>Actionable Insights:</h3>
                <p>
                  Categorized error reports, performance scores, and exports.
                </p>
              </PlatformCard>
              <PlatformCard>
                <div className="flex justify-center mb-5">
                  <div className="bg-white/10 p-3 rounded-sm">
                    <NetworkIcon />
                  </div>
                </div>

                <h3>Scalable for Teams:</h3>
                <p>From freelancers to enterprise QA, BugSpy grows with you</p>
              </PlatformCard>
            </div>
          </div>
        </div>
      </section>
      <section>
        <section className={cn('container m-auto pt-[32px] px-[75px] mt-10')}>
          <div className="flex justify-center flex-col text-center mb-20">
            <h2 className="text-4xl capitalize font-bold mb-3">
              features overview
            </h2>
            <p>
              Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
              vulputate libero
            </p>
          </div>
          <div className="flex mt-10 mb-10 items-center py-20">
            <div className="me-auto">
              <h3 className="text-2xl font-bold mb-3">Error Categorization</h3>
              <p className="text-black/70 w-[350px]">
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
              </p>
            </div>
            <div className="w-[650px] h-[350px] border overflow-hidden rounded-sm shadow-xl">
              <img
                src={ErrorCat}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="flex mt-10 mb-10 items-center py-20">
            <div className="w-[650px] h-[350px] border overflow-hidden rounded-sm shadow-xl me-auto">
              <img
                src={ScreenShots}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-3">
                Full-page Screenshots.
              </h3>
              <p className="text-black/70 w-[350px]">
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
              </p>
            </div>
          </div>

          <div className="flex mt-10 mb-10  items-center py-20">
            <div className="me-auto">
              <h3 className="text-2xl font-bold mb-3">Exportable Reports.</h3>
              <p className="text-black/70 w-[350px]">
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
                Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
                vulputate libero et velit interdum, ac aliquet odio mattis.
              </p>
            </div>
            <div className="w-[650px] h-[350px] border overflow-hidden rounded-sm shadow-xl">
              <img
                src={ShareableReports}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="flex mt-10 mb-10  items-center py-20">
            <div className="w-[650px] h-[350px] border overflow-hidden rounded-sm shadow-xl me-auto">
              <img
                src={ScheduleTest}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-3">
                Scheduled tests & history (Pro+)
              </h3>
              <p className="text-black/70 w-[350px]">
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
        <section className={cn('container m-auto py-[50px] px-[75px] mt-10')}>
          <div className="text-center">
            <h3 className="capitalize font-bold text-4xl">how bugspy works</h3>
            <p className="mt-3">
              Vorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
              vulputate libero
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 place-items-center mt-10">
            <HowItWorksCard
              image={ScheduleTest}
              digit="01"
              title="Enter a website URL"
              subTitle="(UI, console, network, performance)."
              altText="nothing"
            />

            <HowItWorksCard
              image={ScheduleTest}
              digit="02"
              title="Enter a website URL"
              subTitle="(UI, console, network, performance)."
              altText="nothing"
            />
            <HowItWorksCard
              image={ScheduleTest}
              digit="03"
              title="Enter a website URL"
              subTitle="(UI, console, network, performance)."
              altText="nothing"
            />
            <HowItWorksCard
              image={ScheduleTest}
              digit="04"
              title="Enter a website URL"
              subTitle="(UI, console, network, performance)."
              altText="nothing"
            />
          </div>
        </section>
      </section>
    </Homepage>
  );
};

export default Index;
