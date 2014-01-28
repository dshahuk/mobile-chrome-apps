/*

  A Node.js script to convert the mobile-chrome-apps Markdown docs
  into a HTML file to be included in the Chromium documents.

  Usage:
  - Run from the mobile-chrome-apps repo's docs folder: 
    node htmlConvert.js
  - Edit and save the document in the Chromium repo
    (src/chrome/common/extensions/docs/templates/articles/chrome_apps_on_mobile.html)
  - Submit a Change List (CL)
    git-cl upload

  Required external modules:
    - markdown-js (https://github.com/evilstreak/markdown-js/): 
      npm install -g markdown
    - jsdom (https://github.com/tmpvar/jsdom):
      npm install -g jsdom

  Questions about this docs conversion process?
    - Ping pearlchen[at]google.com

*/

var fs = require('fs'),
    markdown = require('markdown').markdown,
    jsdom = require("jsdom");

// paths to all the Markdown pages in order of appearance in final HTML output
var pages = [ {file:'../README.md', anchor:'overview'},
              {file:'Installation.md', anchor:'step-1-install-your-development-tools'},
              {file:'CreateProject.md', anchor:'step-2-create-a-project'},
              {file:'Develop.md', anchor:'step-3-develop'},
              {file:'NextSteps.md', anchor:'next-steps'},
              {file:'CordovaConsiderations.md', anchor:'special-considerations-when-developing-with-cordova'},
              {file:'Publish.md', anchor:'step-4-publish'},
              {file:'ChromeADT.md', anchor:'chrome-apps-developer-tool-adt-for-android'} ];

var numPages = pages.length,
    numParsedPages = 0;
    outputFile = 'doc.html',
    output = [],
    anchors = [];

// clean up old .html file if it's already there
// meta tag is for use by official docs
var meta = '<meta name="doc-family" content="apps"> \n\n\ \
<!-- \n \
  Warning: This document is auto-generated and should not be edited by hand. \n \
  Please see https://github.com/MobileChromeApps/mobile-chrome-apps/tree/master/docs/htmlConvert.js \n \
--> \n\n\ ';
fs.writeFileSync(outputFile, meta, 'utf8');

// convert each .md file to html markup and append to output file
pages.forEach(function(page, i){

  var mdContent,
      html,
      cleanedHtml;

  mdContent = fs.readFileSync(page.file, {encoding:'utf8'}); 
  html = markdown.toHTML(mdContent);

  // Clean up:
  jsdom.env({
    html: html,
    scripts: ['http://code.jquery.com/jquery.js'],
    done: function (errors, window) {
      var $ = window.$,
          anchorId,
          anchorHref;

      // Strip out all paragraphs that start with "Done? Continue to"
      $('p:contains("Done? Continue to")').remove();

      // Re-word opening paragraph that starts with "Let's get started. Continue to"
      $('p:contains("Let\'s get started. Continue to")').text("Let's get started.");

      // For all important headers, add in a id attribute so it shows up in sidebar
      $('h2, h3').each(function(index, element) {

        // clean the anchor of any strange characters and use that as an id
        anchorId = $(this).text().toLowerCase().replace(/ /g, '-').replace(/:|\(|\)/g, '');
        $(element).attr('id', anchorId);
        
        // for debugging and updating 'anchor' property in 'pages' array
        // console.log( anchorId );
        // anchors[i] = anchorId

      });

      // Change links that point to "docs/[something].md" to be anchored to header id instead
      $('a').each(function(index, element) {
        anchorHref = $(element).attr('href');
        if ( anchorHref.indexOf('.md') > -1 ) {
          anchorHref = anchorHref.replace('docs/','');
          if ( anchorHref.indexOf('APIStatus.md') > -1 ) {
            // API Status page will always be on Github
            $(element).attr('href', 'https://github.com/MobileChromeApps/mobile-chrome-apps/blob/master/docs/APIStatus.md');
          }
          else if ( anchorHref.indexOf('#') > -1 ) {
            // already an anchor so strip out the file name and hope it works as a link still...
            $(element).attr('href', anchorHref.substring(anchorHref.indexOf("#")));
          }
          else {
            $(element).attr('href', getAnchor(anchorHref));  
          }
        }     
      });

      // jsdom callback is async so...

      //use an array to store results 
      output[i] = $('body').html();
      
      // and use a counter to see when it's done with all the pages
      numParsedPages++;
      if ( numParsedPages == numPages ) {
        done();
      }

    }
  });

});

function getAnchor( filename ) {
  // loop through 'pages' array to find matching anchor
  for ( var i=0; i<numPages; i++ ) {
    var page = pages[i];
    if ( page.file === filename ) {
      return '#' + page.anchor;
    }
  }
  console.log("Unable to find match for " + filename + " You should check into that.");
  return '#';
}

function done() {

  // for debugging and updating 'anchor' property in 'pages' array
  // console.log(anchors);

  console.log('File outputted. Check the docs folder for doc.html');
  fs.appendFileSync(outputFile, output.join('\n\n'), 'utf8');

}
