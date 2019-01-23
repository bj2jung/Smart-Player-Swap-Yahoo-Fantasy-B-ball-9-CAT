chrome.runtime.sendMessage({ todo: "showPageAction" });

async function loadDataAtPageLoad() {
  await getGameSchedule();
  await getMyRoster();
  populateMyRostersGamesForCurrentWeek();
  populateMyRostersGamesForNextWeek();
  populateDailyMatchupTableData();
  updateMyRosterStatsObject();
  populatePlayerListDropDown();
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
    )
    .then(() => populateNextWeekGameScheduleArray(getTimeStampOfCurrentWeek()));
}

function populateGameScheduleArray(arr) {
  for (let j = 0; j < 3; j++) {
    for (let i = 0 + j; i < arr.length - 1; i += 3) {
      gameScheduleArray[j].push(arr[i]);
    }
  }

  // code below required for glitch between different systems interacting with csv file
  if (gameScheduleArray[2][0].slice(-1) * 1 === 0) {
    for (let i in gameScheduleArray[2]) {
      gameScheduleArray[2][i] = gameScheduleArray[2][i].slice(0, -1);
    }
  }
}

function getTimeStampOfCurrentWeek() {
  const date = new Date();
  const mondayTimeStamp =
    Math.floor(date / 604800000 + 0.399) * 604800000 - 241200000;
  return [
    mondayTimeStamp, //monday
    mondayTimeStamp + 86400000, //tuesday
    mondayTimeStamp + 172800000, //wedday
    mondayTimeStamp + 259200000, //thursday
    mondayTimeStamp + 345600000, //friday
    mondayTimeStamp + 432000000, //satday
    mondayTimeStamp + 518400000, //sunday
    mondayTimeStamp + 604800000, //next monday
    mondayTimeStamp + 1209600000 //following monday
  ];
}

function populateCurrentWeekGameScheduleArray(week) {
  const newGameScheduleArray = gameScheduleArray[0].map(Number);
  let indexOfMondayFirstGame = newGameScheduleArray.indexOf(week[0]);
  if (indexOfMondayFirstGame === -1) {
    indexOfMondayFirstGame = newGameScheduleArray.indexOf(week[1]);
  }
  let indexOfSundayLastGame = newGameScheduleArray.indexOf(week[7]) - 1;
  if (indexOfSundayLastGame === -2) {
    indexOfSundayLastGame =
      newGameScheduleArray.indexOf(week[7] + 86400000) - 1;
  }

  for (i = indexOfMondayFirstGame; i <= indexOfSundayLastGame; i++) {
    currentWeekGameScheduleArray[0].push(newGameScheduleArray[i]);
    currentWeekGameScheduleArray[1].push(gameScheduleArray[1][i]);
    currentWeekGameScheduleArray[2].push(gameScheduleArray[2][i]);
  }
}

const nextWeekGameScheduleArray = [[], [], []];

function populateNextWeekGameScheduleArray(week) {
  const newGameScheduleArray = gameScheduleArray[0].map(Number);
  let indexOfMondayFirstGame = newGameScheduleArray.indexOf(week[7]);

  let indexOfSundayLastGame = newGameScheduleArray.indexOf(week[8]) - 1;
  if (indexOfSundayLastGame === -2) {
    indexOfSundayLastGame =
      newGameScheduleArray.indexOf(week[8] + 86400000) - 1;
  }
  for (i = indexOfMondayFirstGame; i <= indexOfSundayLastGame; i++) {
    nextWeekGameScheduleArray[0].push(newGameScheduleArray[i]);
    nextWeekGameScheduleArray[1].push(gameScheduleArray[1][i]);
    nextWeekGameScheduleArray[2].push(gameScheduleArray[2][i]);
  }
}

/* END OF PART A */

/* PART B: Collect list of players on my Roster and populate myRoster */
const leagueID = window.location.href.split("/")[4];
const myRoster = [[], []];
function getMyRoster() {
  return new Promise(resolve => {
    fetch(`https://basketball.fantasysports.yahoo.com/nba/${leagueID}/4`)
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
const myRostersGamesForCurrentWeek = [];

function getGamesInCurrentWeekForPlayer(team) {
  let gamesInWeek = [];
  for (let j = 1; j <= 2; j++) {
    for (let i in currentWeekGameScheduleArray[j]) {
      if (team.includes(currentWeekGameScheduleArray[j][i])) {
        gamesInWeek.push(currentWeekGameScheduleArray[0][i]);
      }
    }
  }
  return gamesInWeek;
}

function populateMyRostersGamesForCurrentWeek() {
  if (myRostersGamesForCurrentWeek.length == 0) {
    for (let i in myRoster[1]) {
      myRostersGamesForCurrentWeek.push(
        getGamesInCurrentWeekForPlayer(myRoster[1][i])
      );
    }
  }
}

const myRostersGamesForNextWeek = [];

function getGamesInNextWeekForPlayer(team) {
  let gamesInWeek = [];
  for (let j = 1; j <= 2; j++) {
    for (let i in nextWeekGameScheduleArray[j]) {
      if (team.includes(nextWeekGameScheduleArray[j][i])) {
        gamesInWeek.push(nextWeekGameScheduleArray[0][i]);
      }
    }
  }
  return gamesInWeek;
}

function populateMyRostersGamesForNextWeek() {
  if (myRostersGamesForNextWeek.length == 0) {
    for (let i in myRoster[1]) {
      myRostersGamesForNextWeek.push(
        getGamesInNextWeekForPlayer(myRoster[1][i])
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
    "S",
    "# Games next week"
  ];
  return arr;
}

function populateDailyMatchupDataRow(player, team) {
  let arr = new Array(11).fill("");
  arr[0] = player;
  arr[1] = getGamesInCurrentWeekForPlayer(team).length;

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
  arr[9] = getGamesInNextWeekForPlayer(team).length;
  arr[10] = team;
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

let targetPlayerGamesForCurrentWeek;
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
  let arr = new Array(10);
  arr[0] = myPlayer;
  arr[1] = getGamesInCurrentWeekForPlayer(myPlayerTeam).length;

  for (let i = 2; i < 9; i++) {
    arr[i] =
      getGamesInCurrentWeekForPlayer(myPlayerTeam).filter(
        x => x < getTimeStampOfCurrentWeek()[i - 2]
      ).length +
      getGamesInCurrentWeekForPlayer(targetPlayerTeam).filter(
        x => x >= getTimeStampOfCurrentWeek()[i - 2]
      ).length -
      arr[1];
  }
  arr[9] = getGamesInNextWeekForPlayer(myPlayerTeam).length;
  arr[10] = myPlayerTeam;
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

/* PART G: when target player name is hovered, make the dailyMatchupTableData into a html table.
Add event listener to table  */

let previousSelection = null;

function turnDataIntoWeekHTMLTable(headingRow, tableData, tableHTMLElement) {
  while (tableHTMLElement.hasChildNodes()) {
    tableHTMLElement.removeChild(tableHTMLElement.lastChild);
  }
  let table = document.createElement("table");
  let tableBody = document.createElement("tbody");

  let tr = document.createElement("tr");
  tableBody.appendChild(tr);

  for (let i in headingRow) {
    let th = document.createElement("th");
    th.classList.add("col" + i);
    th.appendChild(document.createTextNode(headingRow[i]));
    if (
      getTimeStampOfCurrentWeek()[i - 2] < getTimeStampOfCurrentDay() &&
      getTimeStampOfCurrentDay() < getTimeStampOfCurrentWeek()[i - 1]
    ) {
      th.classList.add("today");
    }
    tr.appendChild(th);
  }

  for (let i = 0; i < tableData.length; i++) {
    let tr = document.createElement("tr");
    for (j = 0; j < tableData[i].length - 1; j++) {
      let td = document.createElement("td");
      td.dayIndex = j;
      td.playerIndex = i;

      if (
        selectedCellCoordinates &&
        j == selectedCellCoordinates[0] &&
        i == selectedCellCoordinates[1] &&
        headingRow[0] == "My Player"
      ) {
        previousSelection = td;
        td.classList.add("selectedCell");
      }

      if (
        getTimeStampOfCurrentWeek()[j - 2] > getTimeStampOfCurrentDay() &&
        headingRow[0] == "My Player" &&
        j < 9
      ) {
        td.addEventListener("click", function(e) {
          previousSelection
            ? previousSelection.classList.remove("selectedCell")
            : null;
          e.target.classList.add("selectedCell");
          previousSelection = e.target;

          selectedCellCoordinates = [td.dayIndex, td.playerIndex];

          populateStatChangeData(e);
          updateStatChangeTable(
            statSelector.options[statSelector.selectedIndex].innerHTML
          );
        });

        if (Number.isInteger(tableData[i][j])) {
          td.classList.add("plusMinus" + tableData[i][j]);
        }
      } else if (j > 1 && j < 9 && Number.isInteger(tableData[i][j])) {
        td.classList.add("pastDate");
      } else if (
        (j < 2 && Number.isInteger(tableData[i][j])) ||
        (j > 8 && Number.isInteger(tableData[i][j]))
      ) {
        td.classList.add("matchCount" + tableData[i][j]);
      }

      if (0 < j) {
        td.classList.add("tableDataOne");
      }

      if (1 < j && j < 9) {
        td.classList.add("tableDataTwo");
      }

      let spanElement = document.createElement("span");
      spanElement.innerHTML = tableData[i][10];

      td.appendChild(document.createTextNode(tableData[i][j]));

      if (j == 0) {
        td.appendChild(spanElement);
        td.classList.add("dataCol0");
      }

      tr.appendChild(td);
    }
    tableBody.appendChild(tr);
  }
  table.appendChild(tableBody);
  tableHTMLElement.appendChild(table);
}

function turnDataIntoStatHTMLTable(headingRow, tableData, tableHTMLElement) {
  while (tableHTMLElement.hasChildNodes()) {
    tableHTMLElement.removeChild(tableHTMLElement.lastChild);
  }
  let table = document.createElement("table");
  let tableBody = document.createElement("tbody");

  let tr = document.createElement("tr");
  tableBody.appendChild(tr);

  for (let i in headingRow) {
    let th = document.createElement("th");
    th.classList.add("col" + i);
    th.appendChild(document.createTextNode(headingRow[i]));
    tr.appendChild(th);
  }

  for (let i = 0; i < tableData.length; i++) {
    let tr = document.createElement("tr");
    for (j = 0; j < tableData[i].length; j++) {
      let td = document.createElement("td");
      td.appendChild(document.createTextNode(tableData[i][j]));

      if (j == 0) {
        td.classList.add("dataCol0");
      }

      if (Number.isInteger(Math.floor(tableData[i][j]))) {
        if (j != 8) {
          tableData[i][j] < 0 ? td.classList.add("statLoss") : null;
          tableData[i][j] == 0 ? td.classList.add("statNoChange") : null;
          tableData[i][j] > 0 ? td.classList.add("statGain") : null;
        } else {
          tableData[i][j] < 0 ? td.classList.add("statGain") : null;
          tableData[i][j] == 0 ? td.classList.add("statNoChange") : null;
          tableData[i][j] > 0 ? td.classList.add("statLoss") : null;
        }
      }

      tr.appendChild(td);
    }
    tableBody.appendChild(tr);
  }

  table.appendChild(tableBody);
  tableHTMLElement.appendChild(table);
}

function getTimeStampOfCurrentDay() {
  const date = new Date();
  return Math.floor(date);
}
/* END OF PART G */

/* PART H: create functionality where user can toggle between the dailyMatchUp and dailyPlusMinus data */

let weekTableDataChoice = null;
function toggleTableData() {
  let selectedPlayersIndex = getSelectedPlayerIndeces(playerSelector);
  if (weekTableDataChoice == dailyPlusMinusTableData) {
    let filteredTable = filterDataForTable(
      selectedPlayersIndex,
      dailyMatchupTableData
    );
    turnDataIntoWeekHTMLTable(
      populateWeekTableHeading("My Player"),
      filteredTable,
      myRosterTable
    );
    weekTableDataChoice = dailyMatchupTableData;
  } else {
    let filteredTable = filterDataForTable(
      selectedPlayersIndex,
      dailyPlusMinusTableData
    );
    turnDataIntoWeekHTMLTable(
      populateWeekTableHeading("My Player"),
      filteredTable,
      myRosterTable
    );
    weekTableDataChoice = dailyPlusMinusTableData;
  }
}

//////
let selectedCellCoordinates = null;

//////

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
            innerArray.push(
              FGFTRecord.innerText.split("/").map(k => Number(k))
            );
          }

          for (let i = 16; i <= 22; i++) {
            let otherStats = htmlDocument.documentElement.querySelector(
              "#statTable0 > tbody > tr:nth-child(" +
                n +
                ") > td:nth-child(" +
                i +
                ") > div"
            );
            innerArray.push(Number(otherStats.innerText));
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
  `https://basketball.fantasysports.yahoo.com/nba/${leagueID}/4?stat1=AS&stat2=AS_2018`,
  `https://basketball.fantasysports.yahoo.com/nba/${leagueID}/4?stat1=AS&stat2=AS_2017`,
  `https://basketball.fantasysports.yahoo.com/nba/${leagueID}/4?stat1=AS&stat2=AL7`,
  `https://basketball.fantasysports.yahoo.com/nba/${leagueID}/4?stat1=AS&stat2=AL14`
];

function updateMyRosterStatsObject() {
  let j = 0;
  asyncForEach(Object.keys(myRosterStatsObject), async key => {
    myRosterStatsObject[key] = await collectMyRosterStats(myRosterStatsUrls[j]);
    j++;
  });
}

async function asyncForEach(array, callback) {
  for (let i = 0; i < array.length; i++) {
    await callback(array[i], i, array);
  }
} //function that allows async/await in forEach loops

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
          arr.push(FGFTRecord.innerText.split("/").map(k => Number(k)));
        }

        for (let i = 14 + j; i <= 20 + j; i++) {
          let otherStats = targetPlayerRow.querySelector(
            `td:nth-child(${i}) > div`
          );
          arr.push(Number(otherStats.innerText));
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
    `https://basketball.fantasysports.yahoo.com/nba/${leagueID}/playersearch?&search=${targetPlayerLastName}&stat1=S_AS_2018&jsenabled=1`,
    `https://basketball.fantasysports.yahoo.com/nba/${leagueID}/playersearch?&search=${targetPlayerLastName}&stat1=S_AS_2017&jsenabled=1`,
    `https://basketball.fantasysports.yahoo.com/nba/${leagueID}/playersearch?&search=${targetPlayerLastName}&stat1=S_AL7&jsenabled=1`,
    `https://basketball.fantasysports.yahoo.com/nba/${leagueID}/playersearch?&search=${targetPlayerLastName}&stat1=S_AL14&jsenabled=1`
  ];

  let j = 0;
  asyncForEach(Object.keys(targetPlayerStatsObject), async key => {
    targetPlayerStatsObject[key] = await collectTargetPlayerStats(
      targetPlayerTeam,
      targetPlayerStatsUrls[j]
    );
    j++;
  });
}

/* END OF PART J */

/* PART K: populate statChangeTable  */
const statTableHeading = [
  "FGM/A",
  "FTM/A",
  "3PTM",
  "PTS",
  "REB",
  "AST",
  "ST",
  "BLK",
  "TO"
];

function calculateStatChange(
  selectedPlayerStats,
  selectedPlayerRemainingGames,
  targetPlayerStats,
  targetPlayerRemainingGames
) {
  let arr = new Array(9);
  for (let i = 0; i < 2; i++) {
    arr[i] = new Array(2);
    for (let j = 0; j < 2; j++) {
      arr[i][j] =
        Math.round(
          (targetPlayerStats[i][j] * targetPlayerRemainingGames -
            selectedPlayerStats[i][j] * selectedPlayerRemainingGames) *
            10
        ) / 10;
    }
    arr[i] = String(arr[i][0]) + "/" + String(arr[i][1]);
  }

  for (let i = 2; i < 9; i++) {
    arr[i] =
      Math.round(
        (targetPlayerStats[i] * targetPlayerRemainingGames -
          selectedPlayerStats[i] * selectedPlayerRemainingGames) *
          10
      ) / 10;
  }
  return arr;
}

const statChangeData = {
  avgStatsCurrentSeason: [],
  avgStatsLastSeason: [],
  avgStats7d: [],
  avgStats14d: []
};

function populateStatChangeData(e) {
  const timestampForCurrentDay = getTimeStampOfCurrentWeek()[
    e.target.dayIndex - 2
  ];
  const selectedPlayerRemainingGames = getRemainingGamesInWeekForPlayerAfterSelectedDate(
    myRostersGamesForCurrentWeek[
      getSelectedPlayerIndeces(playerSelector)[e.target.playerIndex]
    ],
    timestampForCurrentDay
  );
  const targetPlayerRemainingGames = getRemainingGamesInWeekForPlayerAfterSelectedDate(
    targetPlayerGamesForCurrentWeek,
    timestampForCurrentDay
  );

  Object.keys(statChangeData).forEach(function(statType) {
    statChangeData[statType][0] = calculateStatChange(
      myRosterStatsObject[statType][
        getSelectedPlayerIndeces(playerSelector)[e.target.playerIndex]
      ],
      selectedPlayerRemainingGames,
      targetPlayerStatsObject[statType],
      targetPlayerRemainingGames
    );
  });
}

function getRemainingGamesInWeekForPlayerAfterSelectedDate(array, timestamp) {
  let gamesRemainingForSelectedPlayer = array.filter(
    element => element >= timestamp
  ).length;
  return gamesRemainingForSelectedPlayer;
}

function updateStatChangeTable(statType) {
  turnDataIntoStatHTMLTable(
    statTableHeading,
    statChangeData[statType],
    statChangeTable
  );
}

/* PART K END */

/* PART L: create misc HTML elements  */
let availablePlayers = document.querySelectorAll("a.Nowrap");

const comparisonBox = document.createElement("div");

const toggleSwitchOne = document.createElement("label");
toggleSwitchOne.classList.add("switch");
const toggleSwitchTwo = document.createElement("input");
toggleSwitchTwo.setAttribute("type", "checkbox");
const toggleSwitchThree = document.createElement("span");
toggleSwitchThree.classList.add("slider");
toggleSwitchThree.classList.add("round");

toggleSwitchOne.appendChild(toggleSwitchTwo);
toggleSwitchOne.appendChild(toggleSwitchThree);
toggleSwitchTwo.addEventListener("change", () => {
  toggleTableData();
});

const statSelectorDiv = document.createElement("div");
statSelectorDiv.setAttribute("id", "statSelector");

const statSelector = document.createElement("select");
statSelectorDiv.appendChild(statSelector);

for (let statType of Object.keys(statChangeData)) {
  const statOption = document.createElement("option");
  statOption.innerHTML = statType;
  statSelector.appendChild(statOption);
}
statSelector.addEventListener("change", () =>
  updateStatChangeTable(
    statSelector.options[statSelector.selectedIndex].innerHTML
  )
);

/* PART L END */

/* PART M: create HTML select multiple element to allow user to choose which players from myRoster are to be compared */
const playerSelectorDiv = document.createElement("div");
playerSelectorDiv.setAttribute("id", "playerSelector");
const playerSelector = document.createElement("select");
playerSelector.multiple = true;
playerSelectorDiv.appendChild(playerSelector);

function populatePlayerListDropDown() {
  for (let player of myRoster[0]) {
    const playerList = document.createElement("option");
    playerList.innerHTML = player;
    playerSelector.appendChild(playerList);
  }
}
playerSelector.addEventListener("change", () => {
  let selectedPlayersIndex = getSelectedPlayerIndeces(playerSelector);
  let filteredTable = filterDataForTable(
    selectedPlayersIndex,
    weekTableDataChoice
  );
  turnDataIntoWeekHTMLTable(
    populateWeekTableHeading("My Player"),
    filteredTable,
    myRosterTable
  );
});

function getSelectedPlayerIndeces(dropdown) {
  let selectedPlayersIndex = [];
  for (let i = 0; i < dropdown.options.length; i++) {
    dropdown.options[i].selected ? selectedPlayersIndex.push(i) : null;
  }
  return selectedPlayersIndex;
}

function filterDataForTable(selectedPlayersIndex, tableToFilter) {
  selectedPlayerListWeekTableData = [];
  for (let i of selectedPlayersIndex) {
    selectedPlayerListWeekTableData.push(tableToFilter[i]);
  }
  if (selectedPlayerListWeekTableData.length == 0) {
    selectedPlayerListWeekTableData = [new Array(11).fill("")];
  }
  return selectedPlayerListWeekTableData;
}

/* PART M END */

/* PART N: add eventlisteners to HTML page */

let selectedPlayerListWeekTableData = null;

const closeButton = document.createElement("input");
closeButton.setAttribute("id", "closeButton");
closeButton.setAttribute("type", "image");
closeButton.setAttribute(
  "src",
  chrome.runtime.getURL("/images/close-button.png")
);
closeButton.addEventListener("click", () => {
  comparisonBox.style["display"] = "none";
});

const targetPlayerTable = document.createElement("div");
targetPlayerTable.classList.add("weekTable");
const myRosterTable = document.createElement("div");
myRosterTable.classList.add("weekTable");
const statChangeTable = document.createElement("div");
statChangeTable.classList.add("statTable");
comparisonBox.setAttribute("id", "comparisonBox");
document.body.appendChild(comparisonBox);

const selectors = document.createElement("div");
selectors.appendChild(playerSelectorDiv);
selectors.appendChild(statSelectorDiv);

const appImage = document.createElement("img");
appImage.setAttribute("id", "appImage");
appImage.setAttribute("src", chrome.runtime.getURL("/images/app-image.png"));

const headingDiv = document.createElement("div");
headingDiv.classList.add("headingDiv");
const headingGridDiv = document.createElement("div");
headingGridDiv.classList.add("headingGridDiv");
headingGridDiv.appendChild(appImage);
headingGridDiv.appendChild(selectors);
headingGridDiv.appendChild(toggleSwitchOne);
headingGridDiv.appendChild(closeButton);
headingDiv.appendChild(headingGridDiv);
comparisonBox.appendChild(headingDiv);
comparisonBox.appendChild(document.createElement("hr"));
comparisonBox.appendChild(targetPlayerTable);
comparisonBox.appendChild(myRosterTable);
comparisonBox.appendChild(statChangeTable);
comparisonBox.appendChild(document.createElement("hr"));

function attachEventListeners() {
  availablePlayers = document.querySelectorAll("a.Nowrap");
  for (element of availablePlayers) {
    element.addEventListener("mouseover", e => {
      let targetPlayer = e.target.textContent;
      let targetPlayerTeam = e.target.nextElementSibling.textContent;
      comparisonBox.style["display"] = "block";
      populateTargetPlayerMatchupDataRow(targetPlayer, targetPlayerTeam);
      populateDailyPlusMinusTableData(targetPlayerTeam);

      if (weekTableDataChoice == null) {
        weekTableDataChoice = dailyPlusMinusTableData;
      } else if (weekTableDataChoice == dailyMatchupTableData) {
        weekTableDataChoice = dailyMatchupTableData;
      } else {
        weekTableDataChoice = dailyPlusMinusTableData;
      }

      filterDataForTable(
        getSelectedPlayerIndeces(playerSelector),
        weekTableDataChoice
      );
      turnDataIntoWeekHTMLTable(
        populateWeekTableHeading("Target Player"),
        targetPlayerMatchupDataRow,
        targetPlayerTable
      );
      turnDataIntoWeekHTMLTable(
        populateWeekTableHeading("My Player"),
        selectedPlayerListWeekTableData,
        myRosterTable
      );
      Object.keys(statChangeData).forEach(
        statType => (statChangeData[statType] = [new Array(9).fill("-")])
      );
      turnDataIntoStatHTMLTable(
        statTableHeading,
        statChangeData.avgStatsCurrentSeason,
        statChangeTable
      );

      updateTargetPlayerStatsObject(targetPlayer, targetPlayerTeam);

      targetPlayerGamesForCurrentWeek = getGamesInCurrentWeekForPlayer(
        targetPlayerTeam
      );

      tail.select(playerSelector, { placeholder: "Select Player(s)" });
      tail.select(statSelector, {});

      previousSelection
        ? previousSelection.classList.remove("selectedCell")
        : null;
      previousSelection = null;
    });
  }
}
/* PART N END  */

loadDataAtPageLoad();
attachEventListeners();

/* PART O: anytime there is a change in the list of available players, reload program  */
let currentPageURL = window.location.href;

setInterval(function() {
  if (currentPageURL != window.location.href) {
    currentPageURL = window.location.href;
    attachEventListeners();
  }
}, 1000);
/* PART O END */
