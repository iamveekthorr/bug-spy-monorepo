import { cn } from '@/lib/utils';

import DashboardImage from '@/assets/dashboard.png';
import DownloadCard from '@/assets/download-card.png';
import BackgroundImage from '@/assets/99faf793ab4bd9f418a92e270a2fb359015560d9.jpg';

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
              <div className="w-[400px] h-[230px] flex flex-col justify-center align-center text-center text-sm p-3">
                <h3>Easy Automated Testing:</h3>
                <p>Run instant or scheduled tests without setup.</p>
              </div>
              <div className="w-[400px] h-[230px] flex flex-col justify-center text-center  align-center text-sm p-3">
                <h3>Actionable Insights:</h3>
                <p>
                  Categorized error reports, performance scores, and exports.
                </p>
              </div>
              <div className="w-[400px] h-[230px] flex flex-col justify-center align-center text-center text-sm p-3">
                <h3>Scalable for Teams:</h3>
                <p>From freelancers to enterprise QA, BugSpy grows with you</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section>features overview&nbsp; </section>
      <section>how bugspy works &nbsp; </section>
    </Homepage>
  );
};

export default Index;
