const IS_DEBUG = false;
var startTime = Date.now();
var intervalsPassed = 0;
var parser = new DOMParser();
var isListOfDeals = true;

function log(message)
{
    if (IS_DEBUG) console.log(message);
}

function getTitles(){
  var aTags = document.querySelectorAll("a[class^='promotion_card-module__title___'")
  if (aTags.length == 0){
    isListOfDeals = false;
    var aTags = document.querySelectorAll(".book-title");
  }
  let books = [];
    for (let i = 0; i < aTags.length; i++)
    {
      let book = new Map;
      let title = aTags[i].textContent.trim().replace(/\s+/g, '+');
      let classname = aTags[i].className;
      let author;
      if (isListOfDeals){
        author = aTags[i].nextSibling.textContent.trim().replace(/by /, '').replace(/\s+/g, '+');

      } else {
        author = document.querySelectorAll(".credit-names")[0].textContent.trim().replace(/\s+/g, '+');
      }
      book.set("title", title);
      book.set("classname", classname);
      book.set("author", author);

      books.push(book);
    }

    return books;
}
(function getTitle()
{
    var aTags = document.getElementsByTagName("h1");
    let text;
    for (let i = 0; i < aTags.length; i++)
    {
        if (aTags[i].className == "book-title"){
            text = aTags[i].textContent.trim().replace(/\s+/g, '+');
            //text = aTags[i].textContent.trim();
            break;
    }
}
    log("found: " + text);
    return text;
})

/**
 * Changes XML to JSON
 * From: https://gist.github.com/chinchang/8106a82c56ad007e27b1
 * Modified version from here: http://davidwalsh.name/convert-xml-json
 * @param {string} xml XML DOM tree
 */
function xmlToJson(xml) {
    // Create the return object
    var obj = {};

    if (xml.nodeType == 1) {
      // element
      // do attributes
      if (xml.attributes.length > 0) {
        obj["@attributes"] = {};
        for (var j = 0; j < xml.attributes.length; j++) {
          var attribute = xml.attributes.item(j);
          obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
        }
      }
    } else if (xml.nodeType == 3) {
      // text
      obj = xml.nodeValue;
    }

    // do children
    // If all text nodes inside, get concatenated text from them.
    var textNodes = [].slice.call(xml.childNodes).filter(function(node) {
      return node.nodeType === 3;
    });
    if (xml.hasChildNodes() && xml.childNodes.length === textNodes.length) {
      obj = [].slice.call(xml.childNodes).reduce(function(text, node) {
        return text + node.nodeValue;
      }, "");
    } else if (xml.hasChildNodes()) {
      for (var i = 0; i < xml.childNodes.length; i++) {
        var item = xml.childNodes.item(i);
        var nodeName = item.nodeName;
        if (typeof obj[nodeName] == "undefined") {
          obj[nodeName] = xmlToJson(item);
        } else {
          if (typeof obj[nodeName].push == "undefined") {
            var old = obj[nodeName];
            obj[nodeName] = [];
            obj[nodeName].push(old);
          }
          obj[nodeName].push(xmlToJson(item));
        }
      }
    }
    return obj;
  }


/**
 * Get book reviews from title number and show rating
 * last = boolean. Checks if is the last recursive pass
 */

function retrieveBookInfo(bookObj, last){
    var  key = "C8YwtiqnhcXx4f9RKw5i3Q"
//    var urlGoodreads = "https://www.goodreads.com/book/title.xml?key=C8YwtiqnhcXx4f9RKw5i3Q&title=" + title;
    var urlGoodreads = "https://www.goodreads.com/book/title.xml?key=C8YwtiqnhcXx4f9RKw5i3Q&title=" + bookObj.get("title") + "&author=" + bookObj.get("author");

    log("url to search is " + urlGoodreads)

    chrome.runtime.sendMessage(
        {
            contentScriptQuery: "fetchHtml",
            url: urlGoodreads
        }, data =>
        {
            let doc = parser.parseFromString(data, "text/xml");
            var book = doc.getElementsByTagName("book"); //.getElementsByTagName("average_rating");
            var jsonresult = xmlToJson(doc);
            if (jsonresult.GoodreadsResponse){
            log(jsonresult);
            var stars = jsonresult.GoodreadsResponse.book.average_rating;
            log(stars);
            var reviewCount = jsonresult.GoodreadsResponse.book.work.ratings_count;
            log(reviewCount);
            } else { log(bookObj.get("title") + " not found")};
            var info = buildRatingHTML(bookObj.get("title"), bookObj.get("author"), stars, reviewCount, urlGoodreads);
            log("info " + info)
            AppendToChirp(info, bookObj);
        }
)};

/**
 * Builds the span that contains what we want to insert into the chirpbooks page
 */
function buildRatingHTML(title, author, stars, count, url){
    var urlGoodreads = "https://www.goodreads.com/book/title?title=" + title + "&author=" + author;

    var parentSpan = "<br/><span class='goodreadsRating'>";
    parentSpan += "<span class='stars staticStars'>";
    var fullStars = stars;
    i = 0
    while (fullStars > 0.1)
        {
            log("fullStars = " + fullStars)
            if (fullStars >= 1){
                parentSpan += "<span class='staticStar p10' size=12x12></span>";
                fullStars--;
                i++;
            }
            if (fullStars < 1){
                if (fullStars >= 0.5){
                    parentSpan += "<span class='staticStar p6' size=12x12></span>";
               } else {
                parentSpan += "<span class='staticStar p3' size=12x12></span>";
               }
                if (i < 5){
                    parentSpan += "<span class='staticStar p0' size=12x12></span>";
                }
                fullStars = 0
            }
        }
        parentSpan += "</span>";
        parentSpan += "<span class='a-letter-space'></span><span class='a-letter-space'></span>";
        parentSpan += "<a href='" + urlGoodreads + "'>" + stars + " from " +  Number(count).toLocaleString() + " ratings" + "</a>";
        parentSpan += "</span>";
        log("Span object : " + parentSpan);
        cleanSpan = Sanitizer.createSafeHTML(parentSpan);
        log("cleanspan" + cleanSpan)
        return cleanSpan;
};

/**
 * Appends ratings to Chirp page
 */
function AppendToChirp(contentSpan, bookObj)
{
  let className = bookObj.get("classname");
  let title = bookObj.get("title").replace(/\+/g," ");
  log("AppendToChirp, " + className);
  // APPEND TO Chirp PAGE
  var chirpReview = document.querySelectorAll("." + className);
  if (chirpReview.length !== 0)
  {
    if (isListOfDeals) {
      for (let i = 0; i < chirpReview.length; i++){
        log("chirpReview is list: " + chirpReview[i]);
        if (title == chirpReview[i].textContent){
          //log("titlematch for " + title)
          chirpReview[i].insertAdjacentHTML('beforeend', Sanitizer.unwrapSafeHTML(contentSpan));
        } else {
          //log ('nomatch for ' + title)
        }
      }
    } else {
      for (let i = 0; i < chirpReview.length; i++)
      {
          log("chirpReview: " + chirpReview[i]);
          chirpReview[i].insertAdjacentHTML('beforeend', Sanitizer.unwrapSafeHTML(contentSpan));
      }
    }
  }

    // Append to reviews
}
/**
 * Check if the current article is a book in any form
 */
function checkIfBook()
{
    log("checkIfBook");
    return true;
    return (document.querySelectorAll(".credits").length > 0) || (document.querySelectorAll(".book-title") > 0) || (document.querySelectorAll("a[class^='promotion_card-module__title___'").length > 0);
}
/**
 * START POINT
 */
// Try to get the book info as soon as possible

var bookList = false;
var startTime = Date.now();
if (checkIfBook())
{
    var titleChecker = window.setInterval(function()
    {
        intervalsPassed++;
        //log("Interval number " + intervalsPassed);
        //var title = getTitle();
        var bookList = getTitles();
        // Is title found, stop and retrieve book info
        if (bookList !== false)
        { // title found
            window.clearInterval(titleChecker);
            titleFound = true;
            for (i=0; i<bookList.length; i++){
              let title = bookList[i].get('title')
              log(title);
              retrieveBookInfo(bookList[i],false);
              if (!(isListOfDeals)){
                i++;
              }
          };

        }
        // After 10 seconds stop checking for title

        if (intervalsPassed > 20)
        {
            window.clearInterval(titleChecker);
        }
    }, 500);

    /**
     * After loading page check if title was found or try once more
     */
    document.addEventListener("DOMContentLoaded", function()
    {
        log("Page loaded in " + (Date.now() - startTime) + " ms");
        if (!titleFound)
        {
            // Always remove interval (if title not found, should exists)
            window.clearInterval(titleChecker);
            var title = getTitle();
            log("Document load title found? : " + title);
            if (title !== false)
            { // title found
                retrieveBookInfo(title,false);
                titleFound = true;
            }
            else
            {
                log("Book not found. THE END.");
            }
        }
    });
}
