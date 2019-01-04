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
  for (j = 0; j < 3; j++) {
    for (i = 0 + j; i < arr.length - 1; i += 3) {
      gameScheduleArray[j].push(arr[i]);
    }
  }
  for (i in gameScheduleArray[2]) {
    gameScheduleArray[2][i] = gameScheduleArray[2][i].slice(0, -1);
  } //TODO: if statement req'd here to prevent break in differnt platforms
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
    mondayTimeStamp + 604800000, //mon
    mondayTimeStamp + 1209600000 //mon
  ];
}

function populateCurrentWeekGameScheduleArray(week) {
  const newGameScheduleArray = gameScheduleArray[0].map(Number);
  let indexOfMondayFirstGame = newGameScheduleArray.indexOf(week[0]);
  if (indexOfMondayFirstGame === -1) {
    indexOfMondayFirstGame = newGameScheduleArray.indexOf(week[1]);
  } //TODO: improve
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

const nextWeekGameScheduleArray = [[], [], []];

function populateNextWeekGameScheduleArray(week) {
  const newGameScheduleArray = gameScheduleArray[0].map(Number);
  let indexOfMondayFirstGame = newGameScheduleArray.indexOf(week[7]);
  // if (indexOfMondayFirstGame === -1) {
  //   indexOfMondayFirstGame = newGameScheduleArray.indexOf(week[1]);
  // } //TODO: improve
  let indexOfSundayLastGame = newGameScheduleArray.indexOf(week[8]) - 1;
  if (indexOfSundayLastGame === -2) {
    indexOfSundayLastGame =
      newGameScheduleArray.indexOf(week[8] + 86400000) - 1; //TODO: improve
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
    "Next Week # Games"
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

function turnDataIntoWeekHTMLTable(headingRow, tableData, tableHTMLElement) {
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
    for (j = 0; j < tableData[i].length - 1; j++) {
      let td = document.createElement("td");
      td.dayIndex = j;
      td.playerIndex = i;
      /* add click listener to days only AFTER current day */
      if (
        getTimeStampOfCurrentWeek()[j - 2] > getTimeStampOfCurrentDay() &&
        headingRow[0] == "My Player"
      ) {
        td.addEventListener("click", function(e) {
          populateStatChangeData(e);
          updateStatChangeTable(
            statSelector.options[statSelector.selectedIndex].innerHTML
          );
        });
      }
      let spanElement = document.createElement("span");
      spanElement.innerHTML = tableData[i][10];

      td.appendChild(document.createTextNode(tableData[i][j]));

      j == 0 ? td.appendChild(spanElement) : null;

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

function getTimeStampOfCurrentDay() {
  const date = new Date();
  return Math.floor(date);
} //TODO: consider time zone difference

/* END OF PART G */

/* PART H: create functionality where user can toggle between the two tables */

let x = 0;
function toggleTableData() {
  let selectedPlayersIndex = getSelectedPlayerIndeces(playerSelector);
  if (x) {
    let filteredTable = filterDataForTable(
      selectedPlayersIndex,
      dailyPlusMinusTableData
    );
    turnDataIntoWeekHTMLTable(
      populateWeekTableHeading("My Player"),
      filteredTable,
      myRosterTable
    );
    x = 0;
  } else {
    let filteredTable = filterDataForTable(
      selectedPlayersIndex,
      dailyMatchupTableData
    );
    turnDataIntoWeekHTMLTable(
      populateWeekTableHeading("My Player"),
      filteredTable,
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

  // Object.keys(targetPlayerStatsObject).forEach(async (key) => {
  //   targetPlayerStatsObject[key] = await collectTargetPlayerStats(targetPlayerTeam, targetPlayerStatsUrls[i]);
  //   i++
  // })
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

/*   */
const availablePlayers = document.querySelectorAll("a.Nowrap");

const comparisonBox = document.createElement("div");
const toggleButton = document.createElement("button");
toggleButton.innerHTML = "Toggle";
toggleButton.addEventListener("click", () => {
  toggleTableData();
});
const statSelector = document.createElement("select");

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

/* PART L: create HTML select multiple element to allow user to choose which players from myRoster are to be compared */
const playerSelector = document.createElement("select");
playerSelector.multiple = true;

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
    dailyPlusMinusTableData
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
  selectedPlayerListAndPlusMinusData = [];
  for (let i of selectedPlayersIndex) {
    selectedPlayerListAndPlusMinusData.push(tableToFilter[i]);
  }
  if (selectedPlayerListAndPlusMinusData.length == 0) {
    selectedPlayerListAndPlusMinusData = [new Array(11).fill("")];
  }
  return selectedPlayerListAndPlusMinusData;
}

/* PART L END */

let selectedPlayerListAndPlusMinusData = null;

comparisonBox.appendChild(playerSelector);
comparisonBox.appendChild(statSelector);

const closeButton = document.createElement("button");
closeButton.innerHTML = "close";
closeButton.addEventListener("click", () => {
  comparisonBox.style["display"] = "none";
});

const targetPlayerTable = document.createElement("div");
const myRosterTable = document.createElement("div");
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
    filterDataForTable(
      getSelectedPlayerIndeces(playerSelector),
      dailyPlusMinusTableData
    );
    turnDataIntoWeekHTMLTable(
      populateWeekTableHeading("Target Player"),
      targetPlayerMatchupDataRow,
      targetPlayerTable
    );
    turnDataIntoWeekHTMLTable(
      populateWeekTableHeading("My Player"),
      selectedPlayerListAndPlusMinusData,
      myRosterTable
    );

    updateTargetPlayerStatsObject(targetPlayer, targetPlayerTeam);

    targetPlayerGamesForCurrentWeek = getGamesInCurrentWeekForPlayer(
      targetPlayerTeam
    );
  });

  // element.addEventListener("mouseout", () => {
  //   comparisonBox.style["display"] = "none";
  // });
}
/* END  */

loadDataAtPageLoad();
