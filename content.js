chrome.runtime.sendMessage({ todo: "showPageAction" });

async function loadDataAtPageLoad() {
  await getGameSchedule();
  await getMyRoster();
  populateMyRostersGamesForCurrentWeek();
  populateDailyMatchupTableData();
  updateMyRosterStatsObject();
}

/* PART A: Fetch game schedule csv file, populate gameScheduleArray with all games for the season, 
populate currentWeekGameScheduleArray with games that occur in the current week (Monday thru Sunday) */

const gameScheduleArray = [[], [], []];
const currentWeekGameScheduleArray = [[], [], []];
async function getGameSchedule() {
  let gameScheduleCSV = await fetch(
    chrome.runtime.getURL("/nba-2018-schedule.csv")
  );
  gameScheduleCSV
    .text()
    .then(text => text.replace(/\n/g, ","))
    .then(text => text.split(","))
    .then(text => populateGameScheduleArray(text))
    .then(() =>
      populateCurrentWeekGameScheduleArray(getTimeStampOfCurrentWeek())
    );
}

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
  let indexOfSundayLastGame = newGameScheduleArray.indexOf(week[7]) - 1;
  if (indexOfSundayLastGame === -2) {
    indexOfSundayLastGame =
      newGameScheduleArray.indexOf(week[7] + 86400000) - 1; //TODO: improve this function
  }

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
  return new Promise(resolve => {
    fetch("https://basketball.fantasysports.yahoo.com/nba/44190/4") //TODO: get unique LeaugeID# from url and replace 44190 with it
      .then(response => response.text())
      .then(text => {
        const parser = new DOMParser();
        const htmlDocument = parser.parseFromString(text, "text/html");
        if (myRoster[0].length === 0) {
          for (let i = 1; i < 16; i++) {
            let playerOnMyRoster = htmlDocument.documentElement.querySelector(
              `#statTable0 > tbody > tr:nth-child(${i}) > td.Alt.Ta-start.player.Fz-xs.Bdrend > div > div:nth-child(1) > div > a`
            );
            let playerTeam = htmlDocument.documentElement.querySelector(
              `#statTable0 > tbody > tr:nth-child(${i}) > td.Alt.Ta-start.player.Fz-xs.Bdrend > div > div:nth-child(1) > div > span`
            );
            playerOnMyRoster
              ? myRoster[0].push(playerOnMyRoster.innerText)
              : null;
            playerTeam ? myRoster[1].push(playerTeam.innerText) : null;
          }
        }
      })
      .then(() => resolve());
  });
}
/* END OF PART B */

/* PART C: Go through myRoster and create an array for each player that contains the dates of his team's 
games for the week. Store all arrays in a single array myRostersGamesForCurrentWeek */
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

function populateWeekTableHeading(firstColumnHeading) {
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
      td.addEventListener("click", e => {
        populateStatChangeData(e);
      });
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

let x = 0;
function toggleTableData() {
  if (x) {
    turnDataIntoHTMLTable(
      populateWeekTableHeading("My Roster"),
      dailyPlusMinusTableData,
      myRosterTable
    );
    x = 0;
  } else {
    turnDataIntoHTMLTable(
      populateWeekTableHeading("My Roster"),
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

function collectMyRosterStats(url) {
  return new Promise(resolve => {
    let outerArray = new Array(myRoster[0].length);
    fetch(url)
      .then(response => response.text())
      .then(text => {
        const parser = new DOMParser();
        const htmlDocument = parser.parseFromString(text, "text/html");
        for (let n = 1; n <= myRoster[0].length; n++) {
          let innerArray = [];

          for (let i = 12; i <= 14; i += 2) {
            let FGFTRecord = htmlDocument.documentElement.querySelector(
              "#statTable0 > tbody > tr:nth-child(" +
                n +
                ") > td:nth-child(" +
                i +
                ") > div > span"
            );
            innerArray.push(FGFTRecord.innerText);
          }

          for (let i = 16; i <= 22; i++) {
            let otherStats = htmlDocument.documentElement.querySelector(
              "#statTable0 > tbody > tr:nth-child(" +
                n +
                ") > td:nth-child(" +
                i +
                ") > div"
            );
            innerArray.push(otherStats.innerText);
          }
          outerArray[n - 1] = innerArray;
        }
      })
      .then(() => resolve(outerArray));
  });
}

const myRosterStatsObject = {
  avgStatsCurrentSeason: null,
  avgStatsLastSeason: null,
  avgStats7d: null,
  avgStats14d: null
};

const myRosterStatsUrls = [
  "https://basketball.fantasysports.yahoo.com/nba/44190/4?stat1=AS&stat2=AS_2018",
  "https://basketball.fantasysports.yahoo.com/nba/44190/4?stat1=AS&stat2=AS_2017",
  "https://basketball.fantasysports.yahoo.com/nba/44190/4?stat1=AS&stat2=AL7",
  "https://basketball.fantasysports.yahoo.com/nba/44190/4?stat1=AS&stat2=AL14"
];

async function updateMyRosterStatsObject() {
  myRosterStatsObject.avgStatsCurrentSeason = await collectMyRosterStats(
    myRosterStatsUrls[0]
  );
  myRosterStatsObject.avgStatsLastSeason = await collectMyRosterStats(
    myRosterStatsUrls[1]
  );
  myRosterStatsObject.avgStats7d = await collectMyRosterStats(
    myRosterStatsUrls[2]
  );
  myRosterStatsObject.avgStats14d = await collectMyRosterStats(
    myRosterStatsUrls[3]
  ); //TODO: improve
}

/* END OF PART I */

/* PART J: collect stats for targetplayer on mousehover and store data in object*/

function collectTargetPlayerStats(targetPlayerTeam, url) {
  return new Promise(resolve => {
    let arr = [];

    fetch(url)
      .then(response => response.text())
      .then(text => {
        const parser = new DOMParser();
        const htmlDocument = parser.parseFromString(text, "text/html");
        const tableElement = htmlDocument.documentElement.querySelector(
          "table.Table > tbody"
        );
        let targetPlayerRow;

        for (let i = 1; i <= tableElement.querySelectorAll("tr").length; i++) {
          if (
            tableElement.querySelector(
              `tr:nth-child(${i}) > td:nth-child(2) > div > div > div > div > span`
            ).textContent == targetPlayerTeam
          ) {
            targetPlayerRow = tableElement.querySelector(`tr:nth-child(${i})`);
            break;
          }
        }

        let j = 0;
        targetPlayerRow.querySelector("td:nth-child(10) > div > span")
          ? (j = 0)
          : (j = 1);

        for (let i = 10 + j; i <= 12 + j; i += 2) {
          let FGFTRecord = targetPlayerRow.querySelector(
            `td:nth-child(${i}) > div > span`
          );
          arr.push(FGFTRecord.innerText);
        }

        for (let i = 14 + j; i <= 20 + j; i++) {
          let otherStats = targetPlayerRow.querySelector(
            `td:nth-child(${i}) > div`
          );
          arr.push(otherStats.innerText);
        }
      })
      .then(() => resolve(arr));
  });
}

const targetPlayerStatsObject = {
  avgStatsCurrentSeason: null,
  avgStatsLastSeason: null,
  avgStats7d: null,
  avgStats14d: null
};

async function updateTargetPlayerStatsObject(targetPlayer, targetPlayerTeam) {
  let targetPlayerLastName = targetPlayer.split(" ")[1];

  const targetPlayerStatsUrls = [
    `https://basketball.fantasysports.yahoo.com/nba/44190/playersearch?&search=${targetPlayerLastName}&stat1=S_AS_2018&jsenabled=1`,
    `https://basketball.fantasysports.yahoo.com/nba/44190/playersearch?&search=${targetPlayerLastName}&stat1=S_AS_2017&jsenabled=1`,
    `https://basketball.fantasysports.yahoo.com/nba/44190/playersearch?&search=${targetPlayerLastName}&stat1=S_AL7&jsenabled=1`,
    `https://basketball.fantasysports.yahoo.com/nba/44190/playersearch?&search=${targetPlayerLastName}&stat1=S_AL14&jsenabled=1`
  ];

  targetPlayerStatsObject.avgStatsCurrentSeason = await collectTargetPlayerStats(
    targetPlayerTeam,
    targetPlayerStatsUrls[0]
  );
  targetPlayerStatsObject.avgStatsLastSeason = await collectTargetPlayerStats(
    targetPlayerTeam,
    targetPlayerStatsUrls[1]
  );
  targetPlayerStatsObject.avgStats7d = await collectTargetPlayerStats(
    targetPlayerTeam,
    targetPlayerStatsUrls[2]
  );
  targetPlayerStatsObject.avgStats14d = await collectTargetPlayerStats(
    targetPlayerTeam,
    targetPlayerStatsUrls[3]
  ); //TODO: improve

  // let j = 0;
  // Object.keys(targetPlayerStatsObject).forEach(async function(key) {
  //   targetPlayerStatsObject[key] = await collectTargetPlayerStats(
  //     targetPlayerTeam,
  //     targetPlayerStatsUrls[j]
  //   );
  //   j++;
  // });
}

/* END OF PART J */

/* PART K: populate statChangeTable  */
const statTableHeading = [
  "FGM/A",
  "FG%",
  "FTM/A",
  "FT%",
  "3PTM",
  "PTS",
  "REB",
  "AST",
  "ST",
  "BLK",
  "TO"
];

function calculateStatChange(changeDay) {
  /*total if players are swapped - total when player are not swapped */
}

function populateStatChangeData(e) {
  //called by mouseclick of plusMinus
  console.log(e.target);
  console.log(targetPlayerStatsObject);
  console.log(myRosterStatsObject);
}

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
const statChangeTable = document.createElement("div");
comparisonBox.setAttribute("id", "comparisonBox");
document.body.appendChild(comparisonBox);
comparisonBox.appendChild(targetPlayerTable);
comparisonBox.appendChild(myRosterTable);
comparisonBox.appendChild(statChangeTable);
comparisonBox.appendChild(toggleButton);
comparisonBox.appendChild(closeButton);

for (element of availablePlayers) {
  element.addEventListener("mouseover", e => {
    let targetPlayer = e.target.textContent;
    let targetPlayerTeam = e.target.nextElementSibling.textContent;
    comparisonBox.style["display"] = "block";
    populateTargetPlayerMatchupDataRow(targetPlayer, targetPlayerTeam);
    populateDailyPlusMinusTableData(targetPlayerTeam);
    turnDataIntoHTMLTable(
      populateWeekTableHeading("Target Player"),
      targetPlayerMatchupDataRow,
      targetPlayerTable
    );
    turnDataIntoHTMLTable(
      populateWeekTableHeading("My Roster"),
      dailyPlusMinusTableData,
      myRosterTable
    );

    updateTargetPlayerStatsObject(targetPlayer, targetPlayerTeam);
  });

  // element.addEventListener("mouseout", () => {
  //   comparisonBox.style["display"] = "none";
  // });
}
/* END  */

loadDataAtPageLoad();
