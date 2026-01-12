import { Test, TestingModule } from '@nestjs/testing';
import { CookiesService } from '../../services/cookies.service';
import { BrowserPoolService } from '../../services/browser-pool.service';
import { PuppeteerHelpersService } from '../../services/puppeteer-helpers.service';

describe('CookiesService', () => {
  let service: CookiesService;

  beforeEach(async () => {
    const mockBrowserPoolService = {
      requirePage: jest.fn(),
      releasePage: jest.fn(),
    };

    const mockPuppeteerHelpersService = {
      findElementByText: jest.fn(),
      isElementVisible: jest.fn(),
      getTextContent: jest.fn(),
      waitForLoadState: jest.fn(),
      waitForTimeout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CookiesService,
        {
          provide: BrowserPoolService,
          useValue: mockBrowserPoolService,
        },
        {
          provide: PuppeteerHelpersService,
          useValue: mockPuppeteerHelpersService,
        },
      ],
    }).compile();

    service = module.get<CookiesService>(CookiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
