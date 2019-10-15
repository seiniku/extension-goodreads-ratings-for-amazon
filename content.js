const IS_DEBUG = false;
var startTime = Date.now();
var intervalsPassed = 0;
var parser = new DOMParser();

function log(message)
{
    if (IS_DEBUG) console.log(message);
}

function getTitle()
{
    var aTags = document.getElementsByTagName("h1");
    let text;
    for (let i = 0; i <= aTags.length; i++)
    {
        if (aTags[i].className == "book-title"){
            text = aTags[i].textContent.trim().replace(/\s+/g, '+');
            //text = aTags[i].textContent.trim();
            break;
    }
}
    log("found: " + text);
    return text;
}

var tagBody = '(?:[^"\'>]|"[^"]*"|\'[^\']*\')*';
var tagOrComment = new RegExp('<(?:'
    // Comment body.
    + '!--(?:(?:-*[^->])*--+|-?)'
    // Special "raw text" elements whose content should be elided.
    + '|script\\b' + tagBody + '>[\\s\\S]*?</script\\s*' + '|style\\b' + tagBody + '>[\\s\\S]*?</style\\s*'
    // Regular name
    + '|/?[a-z]' + tagBody + ')>', 'gi');

function removeTags(html)
{
    var oldHtml;
    do {
        oldHtml = html;
        html = html.replace(tagOrComment, '');
    } while (html !== oldHtml);
    return html.replace(/</g, '&lt;');
}
/**
 * Get book reviews from ASIN number and show rating
 * last = boolean. Checks if is the last recursive pass
 */
function retrieveBookInfo(title, last)
{
    var urlGoodreads = "https://www.goodreads.com/book/title?title=" + title;
    log("Retrieving goodreads info from url: " + urlGoodreads);
    chrome.runtime.sendMessage(
    {
        contentScriptQuery: "fetchHtml",
        url: urlGoodreads
    }, data =>
    {
        let doc = parser.parseFromString(data, "text/html");
        // GET RATINGS INFO
        let meta = doc.querySelectorAll("#bookMeta");
        log("url data retrieved. meta selector: " + meta);
        log("meta.length: " + meta.length);
        for (let i = 0, element;
            (element = meta[i]); i++)
        {
            log(element);
        }
        if (meta.length === 0)
        {
            log("Goodreads info not found for this book");
            return;
        }
        meta = meta[0];
        // CREATE TAGS
        // Append content
        var parentSpan = "<br/><span class='goodreadsRating'>";
//        var parentSpan = "<br/><span id='goodreadsRating' class='goodreadsRating'>";
        // Stars
        var stars = meta.querySelectorAll(".stars")[0];
        if (stars === undefined || stars === null)
        {
            log("Cannot find '.stars' info on page");
            return;
        }
        // Create manually to avoid injection
        parentSpan += "<span class='stars staticStars'>";
        for (var i = 0; i < stars.children.length; i++)
        {
            parentSpan += "<span class='" + stars.children[i].className + "' size=12x12></span>";
        }
        parentSpan += "</span>";
        // Spacing
        parentSpan += "<span class='a-letter-space'></span><span class='a-letter-space'></span>";
        // Review count and link to Goodreads
        var averageHtml = meta.querySelectorAll("[itemprop=ratingValue]")[0].textContent;
        var votesHtml = meta.querySelectorAll("[itemprop=ratingCount]")[0].parentNode.textContent;
        log(votesHtml);
        log(removeTags(votesHtml)
            .trim());
        // Clean html
        var reviewCount = removeTags(averageHtml)
            .trim() + " from " + removeTags(votesHtml)
            .trim();
        parentSpan += "<a href='" + urlGoodreads + "'>" + reviewCount + "</a>";
        parentSpan += "</span>";
        // FINALLY APPEND TO PAGE
        log("Span object : " + parentSpan);
        // Chirp
        AppendToChirp(parentSpan);
    });
}
/**
 * Appends ratings to Chirp page
 */
function AppendToChirp(contentSpan)
{
    log("AppendToChirp");
    // APPEND TO Chirp PAGE
    var test = "<p class='goodreadsRating'>testestst</p>";
    var chirpReview = document.querySelectorAll(".credits");
    if (chirpReview.length !== 0)
    {
        for (let i = 0; i < chirpReview.length; i++)
        {
            log("chirpReview: " + chirpReview[i]);
            chirpReview[i].insertAdjacentHTML('beforeend', contentSpan)
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
    // Chirp
    return document.querySelectorAll(".credits") !== null || document.querySelectorAll("book-title") !== null;
}
/**
 * START POINT
 */
// Try to get the book info as soon as possible

var asinFound = false;
var startTime = Date.now();
if (checkIfBook())
{
    var asinChecker = window.setInterval(function()
    {
        intervalsPassed++;
        log("Inverval number " + intervalsPassed);
        var asin = getTitle();
        // Is ASIN found, stop and retrieve book info
        if (asin !== false)
        { // ASIN found
            window.clearInterval(asinChecker);
            asinFound = true; // No need to check anymore
            retrieveBookInfo(asin, false);
        }
        // After 10 seconds stop checking for ASIN
        var timeInSeconds = Math.floor((Date.now() - startTime)) / 1000;
        var stopChecks = timeInSeconds > 10;
        if (stopChecks === true)
        {
            window.clearInterval(asinChecker);
        }
    }, 500);
    /**
     * After loading page check if ASIN was found or try once more
     */
    document.addEventListener("DOMContentLoaded", function()
    {
        log("Page loaded in " + (Date.now() - startTime) + " ms");
        if (!asinFound)
        {
            // Always remove interval (if ASIN not found, should exists)
            window.clearInterval(asinChecker);
            var asin = getTitle();
            log("Document load asin found? : " + asin);
            if (asin !== false)
            { // ASIN found
                retrieveBookInfo(asin, false);
            }
            else
            {
                log("Book not found. THE END.");
            }
        }
    });
}