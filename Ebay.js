const puppeteer = require('puppeteer');
const isSameDay = require('date-fns/isSameDay');
const addDays = require('date-fns/addDays');
const format = require('date-fns/format');

class Ebay {
  constructor(text, date = null) {
    //   object to be use within the whole class
    this._browser = null;
    this._page = null;
    this._text = text;
    this._date = date
      ? format(new Date(date), 'd MMM, yyyy')
      : null; /* format the date the same format with the site we are scraping if the date is present */
  }

  //initialize the browser and load the page
  initialize = async () => {
    this._browser = await puppeteer.launch({
      headless: false,
    });
    this._page = await this._browser.newPage();
    // Create interceptor prevent image source from loading therefore making the page to be faster
    await this._page.setRequestInterception(true);
    await this._page.on('request', (request) => {
      if (['image'].indexOf(request.resourceType()) !== -1) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // goto the url and consider it fully loaded when there is no more than 2 network connection at least in 500s
    await this._page.goto('https://www.ebay.com/', {
      waitUntil: 'networkidle2',
    });
  };

  //Search for keywords in ebay
  search = async () => {
    await this._page.type(
      'input[aria-label="Search for anything"]',
      this._text,
      {
        delay: 100,
      }
    );
    await this._page.click('input[type=submit]');

    await this._page.waitForSelector('li[name="LH_Sold"] > div > a');

    // Filter to show only sold item
    await this._page.click('li[name="LH_Sold"] > div > a');
  };

  //   Filter the keywords down further by ensuring it's in the title or the subtitle
  results = async () => {
    await this.initialize();

    await this.search();

    await this._page.waitForTimeout(1000);

    // if true the looping will stop
    let stopScraping = false;

    // add all days into the array
    let allDays = [];

    // create exposeFunction to compare the scraped date is the same with the provided date
    await this._page.exposeFunction('compareDate', (date) => {
      // take the date one day backward
      const isDate = isSameDay(
        new Date(date),
        addDays(new Date(this._date), -1)
      );
      if (isDate) {
        stopScraping = true;
      } else {
        allDays.push(date);
      }
    });

    // if terminate date is provided
    if (this._date !== null) {
      while (!stopScraping) {
        // get the sold date of the item
        await this._page.$$eval(
          '.s-item .s-item__wrapper .s-item__info .s-item__title--tagblock__COMPLETED .POSITIVE',
          (e) => {
            e.map(async (value) => {
              let date = value.textContent.slice(6);
              // compare the date
              await window.compareDate(date);
            });
          }
        );
        await this._page.waitForTimeout(1000);
        // wait for the next pagination button to finish loading
        await this._page.waitForSelector(
          '.srp-river-answer--BASIC_PAGINATION_V2 .s-pagination > span > span .pagination .pagination__next'
        );
        // click on the next pagination button
        await this._page.click(
          '.srp-river-answer--BASIC_PAGINATION_V2 .s-pagination > span > span .pagination .pagination__next'
        );

        await this._page.waitForTimeout(1000);
      }
    } else {
      // the terminate date is not provided, hence scrape all the item

      // get the number of searched results
      const searchResult = await this._page.$eval(
        '.s-answer-region-center-top > div > div > div .srp-controls__count > h1 > span:first-child',
        (e) => e.textContent
      );

      // make the number an integer and divide it with number of item per page
      const resultCount = searchResult.split(',').join('');
      const totalPage = Math.floor(parseInt(resultCount) / 50);

      // loop through the items as the page number is less than totalpage
      for (let i = 0; i < totalPage; i++) {
        await this._page.$$eval(
          '.s-item .s-item__wrapper .s-item__info .s-item__title--tagblock__COMPLETED .POSITIVE',
          (e) => {
            e.map(async (value) => {
              let date = value.textContent.slice(6);
              allDays.push(date);
            });
          }
        );

        await this._page.waitForTimeout(1000);

        // wait for the next pagination button to finish loading
        await this._page.waitForSelector(
          '.srp-river-answer--BASIC_PAGINATION_V2 .s-pagination > span > span .pagination .pagination__next'
        );

        // Click on the next pagination icon
        await this._page.click(
          '.srp-river-answer--BASIC_PAGINATION_V2 .s-pagination > span > span .pagination .pagination__next'
        );

        await this._page.waitForTimeout(1000);
      }
    }

    // calculate the number of occrence of each date and create object of the date and total number of sold item
    const sortedArr = allDays.reduce(
      (prev, curr) => ((prev[curr] = ++prev[curr] || 1), prev),
      {}
    );

    await this._page.waitForTimeout(3000);

    // close browser instance
    await this._browser.close();

    return {
      type: `Date and numbers of sold ${this._text} from ebay`,
      data: sortedArr,
    };
  };
}

module.exports = Ebay;
