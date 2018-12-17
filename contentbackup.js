chrome.runtime.sendMessage({ todo: "showPageAction" });

function doubleAfter2Seconds(x) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(x * 2);
    }, 4000);
  });
}

async function loadDataAtPageLoad() {
  const a = await getGameSchedule();
  const b = await getMyRoster();
  return b;
}

// getGameSchedule();
// getMyRoster();

/* PART A: Fetch game schedule csv file, populate gameScheduleArray with all games for the season, 
populate currentWeekGameScheduleArray with games that occur in the current week (Monday thru Sunday) */
const gameScheduleArray = [[], [], []];
const currentWeekGameScheduleArray = [[], [], []];

async function getGameSchedule() {
  let gameScheduleCSV = await fetch(
    chrome.runtime.getURL("/nba-2018-schedule.csv")
  );
  await gameScheduleCSV
    .text()
    .then(text => text.replace(/\n/g, ","))
    .then(text => text.split(","))
    .then(text => populateGameScheduleArray(text))
    .then(() =>
      populateCurrentWeekGameScheduleArray(getTimeStampOfCurrentWeek())
    );
}

// function getGameSchedule() {
//   fetch(chrome.runtime.getURL("/nba-2018-schedule.csv"))
//     .then(response => response.text())
//     .then(text => text.replace(/\n/g, ","))
//     .then(text => text.split(","))
//     .then(text => populateGameScheduleArray(text))
//     .then(() =>
//       populateCurrentWeekGameScheduleArray(getTimeStampOfCurrentWeek())
//     );
// }

function populateGameScheduleArray(arr) {
  for (j = 0; j < 3; j++) {
    for (i = 0 + j; i < arr.length - 1; i += 3) {
      gameScheduleArray[j].push(arr[i]);
    }
  }
  for (i in gameScheduleArray[2]) {
    gameScheduleArray[2][i] = gameScheduleArray[2][i].slice(0, -1);
  }
}

function getTimeStampOfCurrentWeek() {
  const date = new Date();
  const mondayTimeStamp =
    Math.floor(date / 604800000 + 0.399) * 604800000 - 241200000;
  return [
    mondayTimeStamp, //monday
    mondayTimeStamp + 86400000, //tues
    mondayTimeStamp + 172800000, //wed
    mondayTimeStamp + 259200000, //thurs
    mondayTimeStamp + 345600000, //fri
    mondayTimeStamp + 432000000, //sat
    mondayTimeStamp + 518400000, //sun
    mondayTimeStamp + 604800000 //mon
  ];
}

function populateCurrentWeekGameScheduleArray(week) {
  const newGameScheduleArray = gameScheduleArray[0].map(Number);
  const indexOfMondayFirstGame = newGameScheduleArray.indexOf(week[0]);
  const indexOfSundayLastGame = newGameScheduleArray.indexOf(week[7]) - 1;

  for (i = indexOfMondayFirstGame; i <= indexOfSundayLastGame; i++) {
    currentWeekGameScheduleArray[0].push(newGameScheduleArray[i]);
    currentWeekGameScheduleArray[1].push(gameScheduleArray[1][i]);
    currentWeekGameScheduleArray[2].push(gameScheduleArray[2][i]);
  }
}

/* END OF PART A */

/* PART B: Collect list of players on my Roster and populate myRoster */
const myRoster = [[], []];
function getMyRoster() {
  fetch("https://basketball.fantasysports.yahoo.com/nba/44190/4") //TODO: get unique LeaugeID# from url and replace 44190 with it
    .then(response => response.text())
    .then(text => {
      const parser = new DOMParser();
      const htmlDocument = parser.parseFromString(text, "text/html");
      if (myRoster[0].length === 0) {
        for (let i = 1; i < 16; i++) {
          let playerOnMyRoster = htmlDocument.documentElement.querySelector(
            "#statTable0 > tbody > tr:nth-child(" +
              i +
              ") > td.Alt.Ta-start.player.Fz-xs.Bdrend > div > div:nth-child(1) > div > a"
          );
          let playerTeam = htmlDocument.documentElement.querySelector(
            "#statTable0 > tbody > tr:nth-child(" +
              i +
              ") > td.Alt.Ta-start.player.Fz-xs.Bdrend > div > div:nth-child(1) > div > span"
          );
          playerOnMyRoster
            ? myRoster[0].push(playerOnMyRoster.innerText)
            : null;
          playerTeam ? myRoster[1].push(playerTeam.innerText) : null;
        }
      }
    });
  return new Promise(resolve => {
    resolve(myRoster);
  });
}
/* END OF PART B */

/* PART C: Go through myRoster and create an array for each player that contains the dates of his team's games for the week. Store all arrays in a single array myRostersGamesForCurrentWeek */
const myRostersGamesForCurrentWeek = []; //TODO: confirm that this array is needed

function getGamesInWeekForPlayer(team) {
  let gamesInWeek = [];
  for (j = 1; j <= 2; j++) {
    for (i in currentWeekGameScheduleArray[j]) {
      if (team.includes(currentWeekGameScheduleArray[j][i])) {
        gamesInWeek.push(currentWeekGameScheduleArray[0][i]);
      }
    }
  }
  return gamesInWeek;
}

function populateMyRostersGamesForCurrentWeek() {
  if (myRostersGamesForCurrentWeek.length == 0) {
    for (i in myRoster[1]) {
      myRostersGamesForCurrentWeek.push(
        getGamesInWeekForPlayer(myRoster[1][i])
      );
    }
  }
}
/*  END OF PART C   */

/* PART D: Populate dailyMatchupTableData and heading of table */

const dailyMatchupTableData = [];

function populateTableHeading(firstColumnHeading) {
  let monday = new Date(getTimeStampOfCurrentWeek()[0]);
  let arr = [
    firstColumnHeading,
    "# Games",
    monday.getMonth() + 1 + "/" + monday.getDate(),
    "T",
    "W",
    "T",
    "F",
    "S",
    "S"
  ];
  return arr;
}

function populateDailyMatchupDataRow(player, team) {
  let arr = new Array(9).fill("");
  arr[0] = player;
  arr[1] = getGamesInWeekForPlayer(team).length;

  for (i = 0; i < currentWeekGameScheduleArray[0].length; i++) {
    if (team.includes(currentWeekGameScheduleArray[1][i])) {
      arr[
        getTimeStampOfCurrentWeek().indexOf(
          currentWeekGameScheduleArray[0][i]
        ) + 2
      ] = currentWeekGameScheduleArray[2][i];
    } else if (team.includes(currentWeekGameScheduleArray[2][i])) {
      arr[
        getTimeStampOfCurrentWeek().indexOf(
          currentWeekGameScheduleArray[0][i]
        ) + 2
      ] = "@" + currentWeekGameScheduleArray[1][i];
    }
  }
  return arr;
}

function populateDailyMatchupTableData() {
  if (dailyMatchupTableData.length == 0) {
    for (index in myRoster[0]) {
      dailyMatchupTableData.push(
        populateDailyMatchupDataRow(myRoster[0][index], myRoster[1][index])
      );
    }
  }
}
/*  END OF PART D   */

/* PART E: Get data for targetPlayer */

let targetPlayerMatchupDataRow = [];
function populateTargetPlayerMatchupDataRow(player, team) {
  targetPlayerMatchupDataRow[0] = populateDailyMatchupDataRow(player, team);
}

/* END OF PART E */

/* PART F: Populate dailyPlusMinusTableData */

function populateDailyPlusMinusDataRow(
  myPlayer,
  myPlayerTeam,
  targetPlayerTeam
) {
  let arr = new Array(9);
  arr[0] = myPlayer;
  arr[1] = getGamesInWeekForPlayer(myPlayerTeam).length;

  for (let i = 2; i < 9; i++) {
    arr[i] =
      getGamesInWeekForPlayer(myPlayerTeam).filter(
        x => x < getTimeStampOfCurrentWeek()[i - 2]
      ).length +
      getGamesInWeekForPlayer(targetPlayerTeam).filter(
        x => x >= getTimeStampOfCurrentWeek()[i - 2]
      ).length -
      arr[1];
  }
  return arr;
}

let dailyPlusMinusTableData = [];
function populateDailyPlusMinusTableData(targetPlayerTeam) {
  let arr = [];
  for (let i = 0; i < myRoster[0].length; i++) {
    arr.push(
      populateDailyPlusMinusDataRow(
        myRoster[0][i],
        myRoster[1][i],
        targetPlayerTeam
      )
    );
  }
  dailyPlusMinusTableData = arr;
}

/* END OF PART F */

/* PART G: when target player name is hovered, make the dailyMatchupTableData into a html table  */

function turnDataIntoHTMLTable(headingRow, tableData, tableHTMLElement) {
  while (tableHTMLElement.hasChildNodes()) {
    tableHTMLElement.removeChild(tableHTMLElement.lastChild);
  }
  let table = document.createElement("table");
  let tableBody = document.createElement("tbody");
  table.border = "1";

  let tr = document.createElement("tr");
  tableBody.appendChild(tr);

  for (let i in headingRow) {
    let th = document.createElement("th");
    th.setAttribute("id", "col" + i);
    th.appendChild(document.createTextNode(headingRow[i]));
    tr.appendChild(th);
  }

  for (let i = 0; i < tableData.length; i++) {
    let tr = document.createElement("tr");
    for (j = 0; j < tableData[i].length; j++) {
      let td = document.createElement("td");
      td.appendChild(document.createTextNode(tableData[i][j]));
      tr.appendChild(td);
    }
    tableBody.appendChild(tr);
  }
  table.appendChild(tableBody);
  tableHTMLElement.appendChild(table);
}

/* END OF PART G */

/* PART H: create functionality where user can toggle between the two tables */

let x = 1;
function toggleTableData() {
  if (x) {
    turnDataIntoHTMLTable(
      populateTableHeading("My Roster"),
      dailyPlusMinusTableData,
      myRosterTable
    );
    x = 0;
  } else {
    turnDataIntoHTMLTable(
      populateTableHeading("My Roster"),
      dailyMatchupTableData,
      myRosterTable
    );
    x = 1;
  }
}

/* END OF PART H */

/* PART I: Collect stats for all players in myRoster at page load
- current season average https://basketball.fantasysports.yahoo.com/nba/44190/4?stat1=AS&stat2=AS_2018
- last season average https://basketball.fantasysports.yahoo.com/nba/44190/4?stat1=AS&stat2=AS_2017
- last 7-d average https://basketball.fantasysports.yahoo.com/nba/44190/4?stat1=AS&stat2=AL7
- last 14-d average https://basketball.fantasysports.yahoo.com/nba/44190/4?stat1=AS&stat2=AL14
- projected stats per day https://basketball.fantasysports.yahoo.com/nba/44190/4/team?&date=2018-12-12&stat1=P&stat2=P
  */

function collectStats(url, n) {
  let arr = [];
  fetch(url)
    .then(response => response.text())
    .then(text => {
      const parser = new DOMParser();
      const htmlDocument = parser.parseFromString(text, "text/html");

      for (let i = 12; i <= 14; i += 2) {
        let FGFTRecord = htmlDocument.documentElement.querySelector(
          "#statTable0 > tbody > tr:nth-child(" +
            n +
            ") > td:nth-child(" +
            i +
            ") > div > span"
        );
        arr.push(FGFTRecord.innerText);
      }

      for (let i = 16; i <= 22; i++) {
        let otherStats = htmlDocument.documentElement.querySelector(
          "#statTable0 > tbody > tr:nth-child(" +
            n +
            ") > td:nth-child(" +
            i +
            ") > div"
        );
        arr.push(otherStats.innerText);
      }
      console.log(arr);
    });
}

const avgStatsCurrentSeason = [];
function populateAvgStatsCurrentSeason() {
  // for (let i = 1; i <= myRoster[0].length; i++) {
  // avgStatsCurrentSeason.push(
  let stats = collectStats(
    "https://basketball.fantasysports.yahoo.com/nba/44190/4?stat1=AS&stat2=AS_2018",
    1
  );
  // );
  // }
  console.log(stats);
}

/* END OF PART I */

/*   */
const availablePlayers = document.querySelectorAll("a.Nowrap");

const comparisonBox = document.createElement("div");
const toggleButton = document.createElement("button");
toggleButton.innerHTML = "Toggle";
toggleButton.addEventListener("click", () => {
  toggleTableData();
});

const closeButton = document.createElement("button");
closeButton.innerHTML = "close";
closeButton.addEventListener("click", () => {
  comparisonBox.style["display"] = "none";
});

const myRosterTable = document.createElement("div");
const targetPlayerTable = document.createElement("div");
comparisonBox.setAttribute("id", "comparisonBox");
document.body.appendChild(comparisonBox);
comparisonBox.appendChild(targetPlayerTable);
comparisonBox.appendChild(myRosterTable);
comparisonBox.appendChild(toggleButton);
comparisonBox.appendChild(closeButton);

for (element of availablePlayers) {
  element.addEventListener("mouseover", e => {
    let targetPlayer = e.target.textContent;
    let targetPlayerTeam = e.target.nextElementSibling.textContent;
    comparisonBox.style["display"] = "block";
    populateMyRostersGamesForCurrentWeek(); //TODO: make this function run automatically after myRoster & currentWeekGameScheduleArray are populated
    populateTableHeading();
    // populateDailyMatchupTableData();
    populateTargetPlayerMatchupDataRow(targetPlayer, targetPlayerTeam);
    populateDailyPlusMinusTableData(targetPlayerTeam);
    turnDataIntoHTMLTable(
      populateTableHeading("Target Player"),
      targetPlayerMatchupDataRow,
      targetPlayerTable
    );
    turnDataIntoHTMLTable(
      populateTableHeading("My Roster"),
      dailyMatchupTableData,
      myRosterTable
    );
    collectStats(
      "https://basketball.fantasysports.yahoo.com/nba/44190/4?stat1=AS&stat2=AS_2018",
      1
    );
    populateAvgStatsCurrentSeason();
  });
  // element.addEventListener("mouseout", () => {
  //   comparisonBox.style["display"] = "none";
  // });
}
/* END  */

loadDataAtPageLoad().then(b => {
  console.log(b);
});
