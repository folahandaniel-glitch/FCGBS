/**
 * Reading plans. Each plan lists "sources" (a whole book such as "john", or a chapter range such as "psalms:1-30" or a single
 * chapter "2-chronicles:7") and a number of days; the chapters are shared out evenly across the days. Editable in the backend
 * (Website content → Bible reading plans), so new plans can be added without code.
 */
export interface ReadingPlan {
  slug: string;
  title: string;
  description: string;
  days: number;
  colour: "royal" | "emerald" | "violet" | "amber" | "rose" | "teal" | "sky";
  sources: string[];
}

export const BIBLE_PLANS: ReadingPlan[] = [
  { slug: "gospels-30", title: "The Gospels in 30 days", description: "Meet Jesus in Matthew, Mark, Luke and John — about three chapters a day.", days: 30, colour: "royal", sources: ["matthew", "mark", "luke", "john"] },
  { slug: "new-testament-90", title: "The New Testament in 90 days", description: "From Matthew to Revelation in three months, around three chapters a day.", days: 90, colour: "emerald", sources: ["matthew", "mark", "luke", "john", "acts", "romans", "1-corinthians", "2-corinthians", "galatians", "ephesians", "philippians", "colossians", "1-thessalonians", "2-thessalonians", "1-timothy", "2-timothy", "titus", "philemon", "hebrews", "james", "1-peter", "2-peter", "1-john", "2-john", "3-john", "jude", "revelation"] },
  { slug: "bible-in-a-year", title: "The whole Bible in a year", description: "Genesis to Revelation in 365 days — roughly three to four chapters daily.", days: 365, colour: "violet", sources: ["genesis", "exodus", "leviticus", "numbers", "deuteronomy", "joshua", "judges", "ruth", "1-samuel", "2-samuel", "1-kings", "2-kings", "1-chronicles", "2-chronicles", "ezra", "nehemiah", "esther", "job", "psalms", "proverbs", "ecclesiastes", "song-of-solomon", "isaiah", "jeremiah", "lamentations", "ezekiel", "daniel", "hosea", "joel", "amos", "obadiah", "jonah", "micah", "nahum", "habakkuk", "zephaniah", "haggai", "zechariah", "malachi", "matthew", "mark", "luke", "john", "acts", "romans", "1-corinthians", "2-corinthians", "galatians", "ephesians", "philippians", "colossians", "1-thessalonians", "2-thessalonians", "1-timothy", "2-timothy", "titus", "philemon", "hebrews", "james", "1-peter", "2-peter", "1-john", "2-john", "3-john", "jude", "revelation"] },
  { slug: "apostolic-foundations-40", title: "Apostolic foundations — Acts and the letters (40 days)", description: "Follow the birth and growth of the church in Acts, then read the apostles' letters to the churches.", days: 40, colour: "amber", sources: ["acts", "romans", "1-corinthians", "2-corinthians", "galatians", "ephesians", "philippians", "colossians", "1-thessalonians", "2-thessalonians"] },
  { slug: "pastoral-heart-21", title: "The pastoral heart (21 days)", description: "The shepherd letters and passages on caring for God's people.", days: 21, colour: "teal", sources: ["1-timothy", "2-timothy", "titus", "1-peter", "2-peter", "john:10", "john:21", "ezekiel:34", "psalms:23", "acts:20", "1-thessalonians:2", "hebrews:13"] },
  { slug: "prophets-revival-60", title: "The prophets: judgement, hope and revival (60 days)", description: "Isaiah to Malachi — calls to return, promises of restoration and the coming Messiah.", days: 60, colour: "rose", sources: ["isaiah", "jeremiah", "lamentations", "ezekiel", "daniel", "hosea", "joel", "amos", "obadiah", "jonah", "micah", "nahum", "habakkuk", "zephaniah", "haggai", "zechariah", "malachi"] },
  { slug: "revival-reformation-14", title: "Revival and reformation in Scripture (14 days)", description: "Key chapters where God's people returned to Him: Hezekiah, Josiah, Ezra, Nehemiah, Jonah's Nineveh, Pentecost and Ephesus.", days: 14, colour: "rose", sources: ["2-chronicles:7", "2-chronicles:29", "2-chronicles:30", "2-kings:22", "2-kings:23", "ezra:3", "nehemiah:8", "nehemiah:9", "jonah:3", "joel:2", "acts:2", "acts:4", "acts:19", "revelation:2"] },
  { slug: "proverbs-31", title: "Proverbs — a chapter a day for a month", description: "Wisdom for work, words, money, leadership and family: one chapter for each day of the month.", days: 31, colour: "violet", sources: ["proverbs"] },
  { slug: "psalms-30", title: "Psalms in 30 days", description: "Pray and sing through the first 150 psalms: five a day.", days: 30, colour: "sky", sources: ["psalms"] },
  { slug: "evangelism-14", title: "Evangelism and the mission (14 days)", description: "How the good news is announced, from Jesus' commission through Acts and Romans.", days: 14, colour: "emerald", sources: ["matthew:28", "luke:15", "luke:24", "john:4", "acts:8", "acts:10", "acts:13", "acts:16", "acts:17", "romans:1", "romans:10", "1-corinthians:15", "2-timothy:4", "revelation:7"] },
];
