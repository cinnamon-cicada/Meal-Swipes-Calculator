import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-analytics.js";
import { collection, addDoc, doc, setDoc, getFirestore, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore-lite.js";

//Firestore

const firebaseConfig = {
  apiKey: "AIzaSyDbcFu2WFWvUO1iJMevRckegl7BvabyRCg",
  authDomain: "swipes-calculator.firebaseapp.com",
  projectId: "swipes-calculator",
  storageBucket: "swipes-calculator.appspot.com",
  messagingSenderId: "171893910827",
  appId: "1:171893910827:web:756bdb5e0cdffaeb8b696e",
  measurementId: "G-04ZZMRYEKK"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

//Get user feedback
async function saveHappiness(happiness) {
  console.log("saving...");

  // record timestamp, selection in last DB line, assign an ID in cookies
  var user = getCookie("user_id");
  if(user == "") {
    document.cookie = `user_id=${Math.floor(Math.random()*10000000000)}; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
  }
  try {
    const docRef = await addDoc(collection(db, "swipes_calc"), {
      user_id: user,
      timestamp: new Date().toDateString(),
      emoji: happiness,
      comment: ""
    });

    console.log("Document written with ID: ", docRef.id);
    document.cookie = `recent_doc=${docRef.id}; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}

function revealComments() {
  console.log("Revealing...");
  document.getElementById("feedback-box").removeChild(document.getElementById("happiness-box")); 
  document.getElementById("comments-box").setAttribute('style', 'display:inline-block');
}

async function saveComments() {
  var contents = $('textarea[id="comments"]').val();
  console.log("COMMENT* " + contents);
  try {
    setDoc(doc(db, "swipes_calc", getCookie("recent_doc")), { comment: contents}, { merge : true});
    document.cookie = `recent_doc=${""}; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
  } catch (e) {
    console.error("Error editing document: ", e);
  }
}

function closeFeedback() {
  document.getElementById("intro").removeChild(document.getElementById("feedback-box")); 
}

//Load information from last session, if any
function loadChocolateChips() {
  var swipes = getCookie("swipes");
  var lastDay = getCookie("lastDay");
  var starts = getCookie("starts");
  var ends = getCookie("ends");
  var numDaysOff = getCookie("numDaysOff");

  $('#swipe-num').val(swipes);
  $('#end-date').val(lastDay);

  var daysOffArr = numDaysOff.split(" ");

  for(var i = 0; i < daysOffArr.length; i++) {
    if (daysOffArr[i] != 0) {
      createNewBreak_Days(daysOffArr[i]);
    }
  }

  starts = starts.split(",");
  ends = ends.split(",");

  if(starts.length > 0) {
    for(var i = 0; i < starts.length; i++) {
      if (starts[i].trim() && ends[i].trim()) {
        createNewBreak_Dates(starts[i].trim(), ends[i].trim());
      }
    }
  }
}

// Helper function to loadChocolateChips()
function getCookie(cname) {
  let name = cname + "=";
  let ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

// Display break options when mouse hovers
function displayBreakOptions() {
  document.getElementById('break-options').setAttribute('style', 'display:block');
}

// Add a new break in HTML
function createNewBreak_Days(value) {
  var div = document.getElementsByClassName('add-break-days')[0];
  var clone = div.cloneNode(true);
  $(clone).attr('style', 'display:block');
  value = (value && value != '[object Object]') ? value : '';
  $(clone).children('input[name="num-days"]').val(value);
  document.getElementById('inputs').appendChild(clone);
}

// Add a new break in HTML
function createNewBreak_Dates(start, end) {
  var div = document.getElementsByClassName('add-break-dates')[0];
  var clone = div.cloneNode(true);
  $(clone).attr('style', 'display:block');
  start = (start && start != '[object Object]') ? start : '';
  end = (end && end != '[object Object]') ? end : '';
  $(clone).children('input[name="from-date"]').val(start);
  $(clone).children('input[name="to-date"]').val(end);
  document.getElementById('inputs').appendChild(clone);
}

function passParameters() {
  sum = 0;
  numDaysOff = "";

  $('input[name="num-days"]').each(function() { 
    /*LL: 
    * Can't call val() on an entire array. 
    * Can call if(var) to check if var is NOT null, NaN, etc.*/
    temp = $(this).val();
    if(temp) {
      sum += parseInt($(this).val());
      numDaysOff += $(this).val() + ' ';
    }
  });
  document.cookie = `numDaysOff=${numDaysOff}; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
  generateResults(sum);
}

var copyOfRightHalf = "";

function parseDays(str) {
  var split = str.split("/").map(Number);
  if(split[2] < 100) {
    console.log("last num: " + split[2]);
    split[2] += 2000;
  } else if(split[2] == undefined) {
    split[2] = new Date().getFullYear();
  }

  var ret = new Date(split[2], split[0] - 1, split[1]);
  return ret;
}

function refresh() {
  location.reload();
}

function generateResults(numDaysOff) {
  /* Calculate days of break 
      Inclusive of start, exclusive of end */
  var validInput = true;
  var swipes = document.getElementsByName('swipe-num')[0].value;
  var startStrings = [];
  var endStrings = [];
  var current = new Date();
  var today = new Date(current.getFullYear(), current.getMonth(), current.getDate());

  var starts = $.map(document.getElementsByName('from-date'), function(a) {
    startStrings.push(a.value);
    return parseDays(a.value);
  });
  var ends = $.map(document.getElementsByName('to-date'), function(a) {
    endStrings.push((a.value));
    return parseDays(a.value);
  });

  var breakSum = 0;
  var breakLengths = $.map(ends, function(e, i) {
    var selectedStartDate = starts[i].getTime() >= today.getTime() ? starts[i] : today;
    selectedStartDate = starts[i] == 'Invalid Date' ? NaN : selectedStartDate;
    return e - selectedStartDate;
  });

  breakLengths.forEach(num => {
    if(num) {
      breakSum += Math.abs(num);
    }
  })

  breakSum = Math.ceil(breakSum);
  
  //Calculate remaining days to spend swipes
  var finalDayString = document.getElementsByName('end-date')[0].value;
  var finalDay = parseDays(finalDayString);
  var remainingDays = Math.ceil(Math.ceil(finalDay - today - breakSum) / (1000*60*60*24)) - numDaysOff;
  // console.log(`some vals: rem ${remainingDays} days ${((finalDay - current)/(1000*60*60*24))} tod ${(today)} bs ${(breakSum/(1000*60*60*24))} ${numDaysOff} cur ${swipes} fin ${finalDay}`);
  
  //Calculate swipes
  var swipesPerDay = remainingDays != 1 ? (swipes / (remainingDays-1)) : 0;
  swipesPerDay = swipesPerDay < remainingDays ? 1 : 
  swipesPerDay = Math.floor(swipesPerDay) == swipesPerDay ? swipesPerDay - 1 : Math.floor(swipesPerDay);
  var swipesFinalDay = swipes - (swipesPerDay * (remainingDays-1));

  //Redesign right half of page (HTML)
  var newDiv = document.createElement("div");
  newDiv.id = "results";
  swipeText1 = swipesPerDay == 1 ? "swipe" : "swipes";
  swipeText2 = swipesFinalDay == 1 ? "swipe" : "swipes";

  //Check inputs
  var sidenote = '';
  if(swipesFinalDay > 7) {
    sidenote = `<br> and using ${swipesPerDay + 1} swipe(s)/day means running out ~${Math.floor(remainingDays - swipes / (swipesPerDay + 1))} day(s) early`;
  }

  //Remove extraneous HTML， insert new HTML
  if(swipesPerDay < 0) {
    newDiv.innerHTML =
      `<h2 style="color:#777;">oh no! we've calculated you must use </h2><br>
      <h1>${swipesPerDay} ${swipeText1} per day</h1><br>
      <h2 style="color:#777;">to get rid of all your swipes.</h2><br>
      <h2 style="color:#777;">check your inputs: did you put '24' instead of '2024'? add one too many break days?</h2><br>
      <a href="javascript:refresh();">
      <img src="images/refresh.png" id="icon-refresh">
      </a>`;
  } else {
    newDiv.innerHTML =
      `<h2 style="color:#777;">if you use </h2><br>
      <h1>${swipesPerDay} ${swipeText1} per day</h1><br>
      <h2 style="color:#777;">until the end of the semester, then you'll have</h2><br>
      <h1>${swipesFinalDay} ${swipeText2} left on ${finalDayString}</h1>
      <h2>${sidenote}</h2><br>
      <a href="javascript:refresh();">
      <img src="images/refresh.png" id="icon-refresh">
      </a>`;
  }

  document.body.insertBefore(newDiv, document.getElementById("right-half"));
  document.body.removeChild(document.getElementById("right-half"));

  //Store user input
  document.cookie = `swipes=${swipes}; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
  document.cookie = `lastDay=${finalDayString}; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
  document.cookie = `starts=${startStrings}; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
  document.cookie = `ends=${endStrings}; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
}

// Event detectors
$(document).ready(() => {
  $('#icon-about').on('click', function(e) {
    window.location.href="./about.html";
  });

  $('#icon-house').on('click', function(e) {
    window.location.href="./index.html";
  });

  $('#happy').on('click', function(e) {
    console.log('Registered!');
    saveHappiness('happy');
    revealComments();
  });

  $('#meh').on('click', function(e) {
    saveHappiness('meh');
    revealComments();
  });

  $('#sad').on('click', function(e) {
    saveHappiness('sad');
    revealComments();
  });

  $('#submit-text').on('click', function(e) {
    saveComments();
    closeFeedback();
  });

  $('body').on('keypress', 'input[type=text]', function (e) { 
    if (e.keyCode == 13) {
      passParameters();
    }
   })

  $('#choose-input-days').on('click', createNewBreak_Days);
  $('#choose-input-dates').on('click', createNewBreak_Dates);

  loadChocolateChips();
});

// Delay before closing break options menu
const delay = ms => new Promise(res => setTimeout(res, ms));
const hideBreakOptions = async() => {
  await delay(250);
  document.getElementById('break-options').setAttribute('style', 'display:none');
}