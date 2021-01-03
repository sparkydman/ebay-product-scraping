const Ebay = require('./Ebay');

// async function that will run immediately the app load
(async () => {
  // pass the keyword and date of where the scraping will stop;
  // If the date is not proovided the bot will scrape all the sold items in the website; date format mm/dd/yyyy
  const ebayPs5 = new Ebay('ps5', '1/3/2021');
  // const ebayPs5 = new Ebay('ps5');
  const ps5Results = await ebayPs5.results();

  console.log(ps5Results);

  const ebayXbox = new Ebay('xbox series x', '1/3/2021');
  // const ebayXbox = new Ebay('xbox series x');
  const xboxResults = await ebayXbox.results();

  console.log(xboxResults);
})();
