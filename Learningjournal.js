/*

  Custom Learning Journal in Rise
  -------------------------------

  version: 2.1
  Project page: https://github.com/mikeamelang/learning-journal


  The Learning Journal allows a learner to enter text responses to
  journal prompts throughout a Rise module. At the end of the module, the learner
  can print their “learning journal” of all their responses. The responses are saved
  to the computer so that they persist on future visits to the Rise module.

  HOW TO ADD JOURNAL PROMPTS:
  Wherever a Journal Entry is needed in the Rise module, add a new block of type
  “NOTE” from the “STATEMENT” area and enter the following text:

    Journal Entry
    Section: <insert section name here>
    Prompt: <insert prompt here>
    Take Action: yes <if this is a Take Action item>

  HOW TO ADD AN INTRO TO A SECTION ON THE PRINTED JOURNAL:
  Wherever an intro to a section is needed in the Rise module, add a new block of type
  “NOTE” from the “STATEMENT” area and enter the following text:

    Section Intro
    Section: <insert section name here>
    Section Order: <insert printing order number here. This is optional)
    Intro Title: <insert title to the intro here, like Reflection Activity>
    Intro Text: <insert the text of the intro here>

  HOW TO ADD PRINT BUTTONS OR PROVIDE A CUSTOM TITLE TO THE LEARNING JOURNAL:
  Two print buttons will be shown: Print all journal items and Print take
  action items only. (The actual text of these buttons is customized with the variables below:
  PrintAllButton_Text, PrintTakeActionsOnly_Text and EmailButton_Text)
  Wherever the print buttons are desired in the Rise module, add a new block of type
  “NOTE” from the “STATEMENT” area and enter the following text:

    Journal Buttons
    Course Title: <insert course title here>
    Include Email Button: <yes/no> (This is not required. Default is no.)
    Email Address: <insert email to which journals will be emailed> (This is only required
      if the above "Include Email Button" is set to true.)

*/

// These css selectors select the Notes and select the contents of each Note
var noteSelector =  ".block-impact--note .block-impact__row"; // "[aria-label='Note']";
var noteContentsSelector = '.fr-view';

// These are the flags that must appear at the first line of the Note or the
// Note will not be successfully processed
var flagEntry = "Journal Entry";
var flagButtons = "Journal Buttons";
var flagIntro = "Section Intro";

// These are the labels that accompany the data. These must be entered exactly
// correct or the Note will not be successfully processed
var sectionlabel = "Section:";
var promptlabel = "Prompt:";
var takeactionlabel = "Take Action:";
var coursetitlelabel = "Course Title:";
var includeEmailButtonLabel = "Include Email Button:";
var emailAddressLabel = "Email Address:";
var introsectionlabel = "Section:";
var introSectionOrderLabel = "Section Order:";
var introtitlelabel = "Intro Title:";
var introtextlabel = "Intro Text:";

// These are the text for the Print buttons
var PrintAllButton_Text = "Print My Journal";
var PrintTakeActionsOnly_Text = "Print My Actions";
var EmailButton_Text = "Email My Journal"; // text for the Email button, if active


// These are the data storage variables. When the course loads, these are filled
// with any existing journal entries found in localStorage. Likewise, when any entries are
// updated, these data storage variables are updated AND the localStorage is updated.
var UserData = {};
UserData.Sections = [];
var courseTitle = '';

// localStorageItem is the item in localStorage where the journal entry data is stored.
// a unique identifier is formed by concatenating
// localStorageItem_prefix and the URL path up to the html file.
var localStorageItem_prefix = 'LearningJournal_';
var localStorageItem = '';

// image in the printed journal header
var imageIntroHeader = 'http://amelangrise.s3.amazonaws.com/SharedAssets/images/Reflection_Dark.png';

// These are the settings used by the autosave of journal entries
var typingTimer;                //  timer identifier
var doneTypingInterval = 400;  //  time in ms

// Test if browser is firefox (used in printEntries)
var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

/* ------------------------------------------------------------------------------------------------ */


$(document).ready(function() {
  setlocalStorageItem();
  getSectionsfromLocalStorage();
  initialProcessNotes();
  addEvents();

});


/**
  * @desc sets the value for the variable localStorageItem by concatenating
  *     localStorageItem_prefix and and the URL path up to the html file
  * @param none
  * @return string
*/
function setlocalStorageItem() {
  var loc = document.location;
  var uniqueURL = loc.origin + loc.pathname.substring(0, loc.pathname.lastIndexOf("/"));
  localStorageItem = localStorageItem_prefix + encodeURIComponent(uniqueURL);
}



/**
  * @desc Run processNotes several times when the page first loads
  * @return none
*/
function initialProcessNotes(  ) {
  var MAX_INSTANCES = 5;
  var instances = 0;
  var myInterval = setInterval(myTimerProcessNotes, 300);
  function myTimerProcessNotes() {
    instances++;
    if (instances === MAX_INSTANCES ) {
      clearInterval(myInterval);
    }
    if (processNotes()) { clearInterval(myInterval) }
  }
}



/**
  * @desc add eventlisteners so that the func processNotes is fired when appropriate
  * @param none
  * @return none
*/
function addEvents() {

  // fire processNotes when the url changes
  function hashchanged(){
    processNotes();
  }
  window.addEventListener("hashchange", hashchanged, false);

  // fire processNotes when the CONTINUE button is clicked and new blocks are dynamically added
  function nodeadded(event) {
    if( event.relatedNode.nodeName == "SECTION" ) {
      if ( event.relatedNode.className == "blocks-lesson" ) {
        processNotes();
      }
    }

  }
  window.addEventListener("DOMNodeInserted", nodeadded, false);
}



/**
  * @desc Create Section object
  * @param string title - title of section
  * @param string introtitle - title of the section intro that appears in printed journal
  * @param string introtext - text of the section intro that appears in printed journal
  * @return none
*/
function Section( title, order, introtitle, introtext ) {
  if (!order) {
    order = 999
  }
	this["title"] = title;
  this["order"] = order;
  this["entries"] = [];
  introtitle = (introtitle) ? introtitle : '';
  this["introtitle"] = introtitle; // optional
  introtext = (introtext) ? introtext : '';
  this["introtext"] = introtext; // optional
}


/**
  * @desc Create Entry object
  * @param string section - which section does this entry belong in (linked to a Section object)
  * @param string prompt - text of the prompt
  * @param string response - text of the response (blank if new)
  * @param bool isTakeAction - is this a Take Action?
  * @return none
*/
function Entry( section, prompt, response, isTakeAction ) {
	this["section"] = section;
	this["prompt"] = prompt;
  this["response"] = response;
  this["isTakeAction"] = isTakeAction;
  // another data element is entryid, added after the entry is created
  // another data element is sectionid, added after the entry is created
}


/**
  * @desc these functions either copy localStorageItem to UserData.Sections or vice versa
  * @param none
  * @return none
*/
function setSectionstoLocalStorage() {
  localStorage.setItem(localStorageItem, JSON.stringify(UserData.Sections));
}
function getSectionsfromLocalStorage() {
  var retrievedString = localStorage.getItem(localStorageItem);
  if ( retrievedString == null || retrievedString == '' ) {
    localStorage.setItem(localStorageItem, '');
    var emptyarray = [];
    return emptyarray;
  } else {
    UserData.Sections = JSON.parse(retrievedString);
  }
}


/**
  * @desc This is the workhorse of the learning journal. It finds all the Notes on the page
  *   and processes them depending on what type of Note it is
  * @param none
  * @return true if Notes were found
*/
function processNotes() {

    var $notes = $( noteSelector);
    var returnValue = ($notes.length > 0) ? true : false ;

    $notes.each( function() {
      switch (this.querySelector(noteContentsSelector).firstChild.innerText.trim()) {
        case flagEntry:
          processEntry( this );
          this.parentNode.removeChild(this);
          break;

        case flagButtons:
          processButtons( this);
          this.parentNode.removeChild(this);
          break;

        case flagIntro:
          processIntro( this );
          this.parentNode.removeChild(this);
          break;

        default:
          break;
      }

    });
    setSectionstoLocalStorage();
    return returnValue;
}


/**
  * @desc This processes an Entry. If successful, it updates UserData
  *   and renders the entry to DOM
  * @param jQueryObject note - the note to be processed
  * @return none
*/
function processEntry( note ) {

  var entry = createEntryfromNote( note );
  if ( entry ) {

    // use indexSection and indexEntry to determine if this is a new section and entry
    var indexSection = -1; indexEntry = -1;
    for (var i = 0; i < UserData.Sections.length; i++) {
      var currentSection = UserData.Sections[i];
      if ( currentSection.title == entry.section ) { indexSection = i; }
      for (var j = 0; j < currentSection.entries.length; j++ ) {
        if ( currentSection.entries[j].section == entry.section &&
          currentSection.entries[j].prompt == entry.prompt ) {
          indexEntry = j;
        }
      }
    }

    // New section, new entry
    if (indexSection == -1 && indexEntry == -1 ) {
      indexSection = UserData.Sections.length;
      indexEntry = 0;
      var newsection = new Section( entry.section );
      newsection.entries.push( entry );
      UserData.Sections.push( newsection );
    }

    // Existing section, new entry
    if (indexSection > -1 && indexEntry == -1 ) {
      indexEntry = UserData.Sections[indexSection].entries.length;
      UserData.Sections[indexSection].entries.push( entry );
    }

    // Existing section, existing entry
    if (indexSection > -1 && indexEntry > -1 ) {
      entry.response = UserData.Sections[indexSection].entries[indexEntry].response;
    }

    renderEntrytoDOM( note.parentNode, entry, indexSection, indexEntry );
  }
}


/**
  * @desc renders an Entry to DOM.
  * @param DOMElement parentcontainer - entry's parent container
  * @param Entry entry - the entry
  * @param string sectionid - the id of the corresponding section in UserData.Sections
  * @param string entryid - the id on the entry within UserData.Sections
  * @return none
*/
function renderEntrytoDOM( parentcontainer, entry, sectionid, entryid ) {

    // create container
    var container = document.createElement("div");
    container.className = "journalentry-container";
    container.dataset.sectionid = sectionid;
    container.dataset.entryid = entryid;

    // create prompt
    var prompt = document.createElement("div");
    prompt.className = "journalentry-prompt";
    prompt.innerText = entry.prompt;
    container.appendChild( prompt );

    // create response
    var response = document.createElement("textarea");
    response.className = "journalentry-response";
    response.value = entry.response;
    container.appendChild(response);
    parentcontainer.appendChild(container);

    $( ".block-impact--note:has( .journalentry-container)").addClass("block-impact--note-journalentry");
}


/**
  * @desc creates an Entry object from a Note.
  * @param DOMElement note - note from which to create the entry
  * @return Entry object or null if fail (section or prompt is empty)
*/
function createEntryfromNote( note ) {

  var section = '', prompt = '', isTakeAction = false;
  var notecontents = note.querySelector(noteContentsSelector);
  for (var i = 0; i< notecontents.childNodes.length; i++ ) {
    var a = notecontents.childNodes[i];

    // set the section
    if ( a.innerText.substring(0,sectionlabel.length) == sectionlabel ) {
      section = a.innerText.substring(sectionlabel.length).trim();
    }
    // set the prompt
    if ( a.innerText.substring(0,promptlabel.length) == promptlabel ) {
      prompt = a.innerText.replace(promptlabel, "").trim();
    }
    // set the takeaction
    if ( a.innerText.substring(0,takeactionlabel.length) == takeactionlabel ) {
      var TakeActiontext = a.innerText.replace(takeactionlabel, "").trim();
      if ( TakeActiontext.toLowerCase() == "yes" ) { isTakeAction = true }
    }
  }

  if (section != '' && prompt != '') {
    return new Entry( section, prompt, '', isTakeAction); // response is added later
  } else {
    return null;
  }
}


/**
  * @desc This processes the Buttons. It updates sets the courseTitle variable
  *   and renders the buttons to DOM
  * @param DOMElement note - note
  * @return none
*/
function processButtons( note ) {

  var includeEmailButton = false;
  var emailAddress = '';

  // Set Course Title
  var notecontents = note.querySelector(noteContentsSelector);
  for (var i = 0; i< notecontents.childNodes.length; i++ ) {
    var a = notecontents.childNodes[i];

    // Set the Course Title
    if ( a.innerText.substring(0,coursetitlelabel.length) == coursetitlelabel ) {
      courseTitle = a.innerText.substring(coursetitlelabel.length).trim();
    }

    // Include an Email button
    if ( a.innerText.substring(0,includeEmailButtonLabel.length) == includeEmailButtonLabel ) {
      var emailButtonSetting = a.innerText.replace(includeEmailButtonLabel, "").trim();
      if ( emailButtonSetting.toLowerCase() == "yes" ) { includeEmailButton = true }
    }

    // Email address to which the journals will be emailed
    if ( a.innerText.substring(0,emailAddressLabel.length) == emailAddressLabel ) {
      emailAddress = a.innerText.substring(emailAddressLabel.length).trim();
    }
  }

  // Render buttons to DOM
  var container = document.createElement("div");
  container.className = "journalbuttons-container";

  var button1 = document.createElement("div");
  button1.className = "journalprintbutton";
  button1.innerText = PrintAllButton_Text;
  button1.addEventListener("click", function() { printEntries(false)} );
  container.appendChild(button1);

  var button2 = document.createElement("div");
  button2.className = "journalprintbutton";
  button2.innerText = PrintTakeActionsOnly_Text;
  button2.addEventListener("click", function() { printEntries(true)} );
  container.appendChild(button2);
  note.parentNode.appendChild(container);

  if ( includeEmailButton ) {
    var button3 = document.createElement("div");
    button3.className = "journalprintbutton";
    button3.innerText = EmailButton_Text;
    button3.addEventListener("click", function() { emailEntries( emailAddress )} );
    container.appendChild(button3);
    note.parentNode.appendChild(container);
  }
}


/**
  * @desc This processes a Section Intro, saving the intro information to UserData
  * @param DOMElement note - note
  * @return none
*/
function processIntro( note ) {

  var notecontents = note.querySelector(noteContentsSelector);
  var introsection = '', introSectionOrder = 999, introtitle = '', introtext = '';
  for (var i = 0; i< notecontents.childNodes.length; i++ ) {
    var a = notecontents.childNodes[i];

    // set the intro section
    if ( a.innerText.substring(0,introsectionlabel.length) == introsectionlabel ) {
      introsection = a.innerText.substring(introsectionlabel.length).trim();
    }
    // set the intro section index
    if ( a.innerText.substring(0,introSectionOrderLabel.length) == introSectionOrderLabel ) {
      introSectionOrder = parseInt(a.innerText.substring(introSectionOrderLabel.length).trim());
      if ( introSectionOrder !== introSectionOrder ) { //  is not a number
        introSectionOrder = 999
      }
    }
    // set the intro title
    if ( a.innerText.substring(0,introtitlelabel.length) == introtitlelabel ) {
      introtitle = a.innerText.substring(introtitlelabel.length).trim();
    }
    // set the intro text
    if ( a.innerText.substring(0,introtextlabel.length) == introtextlabel ) {
      introtext = a.innerText.replace(introtextlabel, "").trim();

      // grab the rest of the Note for the text also
      i++;
      while (i < notecontents.childNodes.length) {
        introtext += "<br /><br />" + notecontents.childNodes[i].innerText;
        i++;
      }
    }
  }

  if (introsection != '' && introtitle != '' && introtext != '') {
    var sectionMatch = -1;
    for (var j = 0; j < UserData.Sections.length; j++) {
      if ( UserData.Sections[j].title == introsection ) { sectionMatch = j; }
    }

    if (sectionMatch == -1) {
      // new section
      UserData.Sections.push( new Section( introsection, introSectionOrder, introtitle, introtext ) );
    } else {
      // existing section
      UserData.Sections[sectionMatch].order = introSectionOrder;
      UserData.Sections[sectionMatch].introtitle = introtitle;
      UserData.Sections[sectionMatch].introtext = introtext;
    }
    UserData.Sections.sort( compareOrders )
  }

  // SUB function
  // Sorts an array of objects on a particular property
  function compareOrders( a, b ) {
    if ( a.order < b.order ){
      return -1;
    }
    if ( a.order > b.order ){
      return 1;
    }
    return 0;
  }
}


// Set up autosave of journal entries to UserData and to localStorage
// see https://stackoverflow.com/questions/4220126/run-javascript-function-when-user-finishes-typing-instead-of-on-key-up?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
$(document).on('keyup', '.journalentry-response', function(){
    clearTimeout(typingTimer);
    var myentrycontainer = this.parentNode;
    typingTimer = setTimeout(function() {
      var response = myentrycontainer.querySelector('.journalentry-response').value;
      var sectionid = myentrycontainer.dataset.sectionid;
      var entryid = myentrycontainer.dataset.entryid;
      UserData.Sections[sectionid].entries[entryid].response = response;
      setSectionstoLocalStorage();
    }, doneTypingInterval);
});


/**
  * @desc prints the entries by opening a new browser window with a print button on it
  * @param bool TakeActionsOnly - are we printing all or simply Take Actions?
  * @return none
*/
function printEntries( TakeActionsOnly ) {

  var printtitle = ( TakeActionsOnly ) ? "Take Action Items" : "Learning Journal";
  var printCommand = (isFirefox)
		? 'window.print()'
		: 'document.execCommand(\"print\", false, null);';
	var date = getDate();

	var contents = "<html><head></head><body>"
  contents+= "<div class='no-print printbutton' ><button onclick='" + printCommand + "'>" +
    "Print My " + printtitle + "</button></div>";
	contents+="<div class='headertext' >" + courseTitle + " " + printtitle + "</div>";
	contents+="<div class='date' >"+date+"</div>";

  // print each entry if applicable
  for (var i = 0; i< UserData.Sections.length; i++ ) {
       var currentSection = UserData.Sections[i];

       var sectionheader = "<div class='sectiontitle' >Section: " + currentSection.title + "</div>";
       if ( currentSection.introtitle ) {
         sectionheader +=
           "<div class='sectionintrocontainer' >" +
             "<img class='sectionintroicon' src='" + imageIntroHeader + "' />" +
             "<div class='sectionintrotextcontainer'>" +
               "<div class='sectionintrotitle'>" + currentSection.introtitle + "</div>" +
               "<div class='sectionintrotext'>" + currentSection.introtext + "</div>" +
           "</div></div>";
       }


       var sectioncontents = '';
       for (var j = 0; j< currentSection.entries.length; j++ ) {
          if ( (!TakeActionsOnly || currentSection.entries[j].isTakeAction == true) &&
                currentSection.entries[j].response != '' ) {
            sectioncontents+="<div class='prompt' >" + currentSection.entries[j].prompt + "</div>";
            sectioncontents+="<div class='response' >" + currentSection.entries[j].response + "</div>";
          }
       }
       if (sectioncontents != '' ) {
          contents+= "<div class='sectionarea'>" + sectionheader + sectioncontents + "</div>";
          if (i != UserData.Sections.length - 1 ) { contents+= "<div class='pagebreak'></div>" }
       }
    //}
  }

	contents+= "</body></html>"

  var myWindow = window.open("","Print " + getTimestamp(),"width=810,height=610,scrollbars=1,resizable=1");
	myWindow.document.write(contents);

	var myStringOfstyles =  "@media print { .no-print, .no-print * { display: none !important; } }" +
							"body { width:650px;padding:20px;font-family:sans-serif }" +
							".printbutton { height:20px;padding:10px;margin-bottom:20px;text-align:center; }" +
							".headertext { text-transform: uppercase;text-align:center;font-size:22px; " +
              "    font-weight:bold;margin-bottom:20px; background-color: #4c4c4c !important; " +
              "    -webkit-print-color-adjust: exact;color: white; padding: 15px 20px; }" +
							".date { font-size:16px;font-weight:bold;text-align: center;margin-bottom: 30px }" +
              ".sectionarea { margin-bottom:80px;}" +
              ".sectionintrocontainer { margin-bottom: 5px; color: black; padding: 25px 20px;}" +
              ".sectionintroicon { height: 160px;  display: inline-block; padding: 0px 20px}" +
              ".sectionintrotextcontainer { display: inline-block; width: 330px; vertical-align: top;" +
              "    padding-left:20px}" +
              ".sectionintrotitle { font-weight: bold; font-size: 15pt;margin-bottom: 12px;}" +
              ".sectionintrotext { line-height: 18pt;}" +
              ".sectiontitle { font-weight: bold; margin-bottom: 10px;}" +
              ".pagebreak { page-break-before: always; }" +
              ".response { font-size: 11pt;border: 1.5px gray solid;padding: 15px;" +
              "    margin-bottom: 20px;white-space: pre-wrap; margin-top: 0px; }" +
							".prompt { font-size: 16px; background-color: #4c4c4c !important; " +
              "    -webkit-print-color-adjust: exact;color: white; font-weight: bold; " +
              "    padding: 8px 10px;line-height:15pt; }";
							//".section { font-size: 18px;font-weight:bold;margin-top: 50px;text-align: center;margin-bottom: 15px  }";
	var linkElement = myWindow.document.createElement('link');
	linkElement.setAttribute('rel', 'stylesheet');
	linkElement.setAttribute('type', 'text/css');
	linkElement.setAttribute('href', 'data:text/css;charset=UTF-8,' + encodeURIComponent(myStringOfstyles));
	myWindow.document.head.appendChild(linkElement);

  var titleElement = myWindow.document.createElement('title');
  var t = myWindow.document.createTextNode("Print " + printtitle);
  titleElement.appendChild(t);
  myWindow.document.head.appendChild(titleElement);

  // sub-function
  function getDate() {
    var m_names = new Array("January", "February", "March",
    "April", "May", "June", "July", "August", "September",
    "October", "November", "December");
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth();
    var yyyy = today.getFullYear();
    if(dd<10) { dd='0'+dd }
    return m_names[mm]+' '+dd+', '+yyyy;
  }
}


/**
  * @desc emails the entries
  * @param none
  * @return none
*/
function emailEntries( emailAddress ) {

  var printtitle = "Learning Journal";
  var lineBreak = '%0D';
	var contents = courseTitle + lineBreak + printtitle + lineBreak + lineBreak;
  contents+= "------------------------------" + lineBreak;

  // print each entry if applicable
  for (var i = 0; i< UserData.Sections.length; i++ ) {
       var currentSection = UserData.Sections[i];

       var sectionheader = "Section: " + currentSection.title + lineBreak;
       if ( currentSection.introtitle ) {
         sectionheader +=
           currentSection.introtitle + lineBreak +
           currentSection.introtext + lineBreak + lineBreak;
       }


       var sectioncontents = '';
       for (var j = 0; j< currentSection.entries.length; j++ ) {
          if ( currentSection.entries[j].response != '' ) {
            sectioncontents+= currentSection.entries[j].prompt + lineBreak;
            sectioncontents+= currentSection.entries[j].response + lineBreak + lineBreak;
          }
       }
       if (sectioncontents != '' ) {
          contents+= sectionheader + sectioncontents;
          if (i != UserData.Sections.length - 1 ) { contents+= "------------------------------" + lineBreak }
       }
    //}
  }


  window.open('mailto:' + emailAddress +
              '?subject=My Learning Journal&body=' + contents);


}



/**
  * @desc returns timestamp in the form of yyyymmddhhmmss
  * @param none
  * @return string
*/
function getTimestamp() {
    var today = new Date();
    var mm = today.getMonth()+1;
    if(mm<10) { mm='0'+mm }
    var dd = today.getDate();
    if(dd<10) { dd='0'+dd }
    var hh = today.getHours();
    if(hh<10) { hh='0'+hh }
    var min = today.getMinutes();
    if(min<10) { min='0'+min }
    var sec = today.getSeconds();
    if(sec<10) { sec='0'+sec }
    return today.getFullYear() + mm + dd + hh+ min + sec ;
}

// Polyfill for isNaN
Number.isNaN = Number.isNaN || function(value) {
    return value !== value;
}
