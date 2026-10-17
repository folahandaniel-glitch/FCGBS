/**
 * Which library teachings are also offered as lessons inside which courses. At seed time each teaching becomes a lesson of the
 * course (added once by title, so edits made by lecturers are never overwritten). Course codes may belong to any catalogue part.
 */
const T = {
  apostolic: ["what-is-an-apostle", "the-apostles-doctrine", "foundation-and-cornerstone", "marks-of-apostolic-ministry", "authority-and-its-limits", "planting-churches-the-pauline-way", "teams-and-co-workers", "guarding-the-deposit", "accountability-and-the-jerusalem-council", "suffering-and-perseverance-in-ministry", "gospel-and-culture", "raising-and-releasing-leaders"],
  pastoral: ["the-shepherds-heart", "character-of-the-overseer", "preaching-and-teaching-the-word", "pastoral-visitation-and-care", "counselling-with-wisdom-and-boundaries", "church-discipline-and-restoration", "marriage-and-family-ministry", "grief-funerals-and-hope", "leading-with-integrity-money-and-power", "caring-for-children-and-vulnerable-people", "serving-the-poor-and-the-stranger", "sustaining-a-long-ministry", "welcoming-newcomers-and-closing-the-back-door"],
  evangelical: ["the-gospel-in-a-nutshell", "sharing-your-faith-naturally", "repentance-and-faith", "follow-up-and-discipleship", "answering-common-questions", "evangelism-in-the-marketplace-and-online", "mass-evangelism-and-crusades-wisely", "missions-and-the-unreached", "the-holy-spirit-and-evangelism", "children-and-youth-evangelism", "the-local-church-as-a-witnessing-community"],
  prophetic: ["what-biblical-prophecy-is", "testing-every-prophetic-word", "prophetic-ethics", "prophets-and-the-local-church", "the-old-testament-prophets-and-justice", "hearing-gods-voice", "dreams-visions-and-impressions", "intercession-and-the-prophetic-burden", "false-prophets-and-spiritual-abuse", "the-prophetic-and-the-end-times", "developing-a-prophetic-culture-of-the-word"],
  revival: ["what-is-revival", "hezekiah-reopens-the-house", "josiah-and-the-book-of-the-law", "nehemiah-and-ezra-rebuilding-and-reading", "pentecost-and-the-early-church", "the-protestant-reformation", "moravians-and-herrnhut", "the-great-awakening-and-the-wesleys", "welsh-revival-and-azusa-street", "revival-in-africa-harris-babalola-east-african", "korea-and-the-hebrides", "what-hinders-revival", "preparing-for-revival-today", "revival-and-social-reformation"],
};

export const COURSE_TEACHINGS: Record<string, string[]> = {
  // the four teaching streams as complete courses
  FIV210: T.apostolic, FIV211: T.pastoral, FIV212: T.evangelical, FIV213: T.prophetic,
  THE207: T.revival, THE212: [...T.revival.slice(5, 11), "what-hinders-revival", "revival-and-social-reformation"],
  // the fivefold courses
  FIV102: T.apostolic.slice(0, 5), FIV201: T.apostolic.slice(5, 9), FIV301: T.apostolic.slice(9),
  FIV103: T.prophetic.slice(0, 3), FIV202: T.prophetic.slice(3, 8), FIV302: T.prophetic.slice(8),
  FIV104: T.evangelical.slice(0, 3), FIV203: T.evangelical.slice(3, 8),
  FIV105: T.pastoral.slice(0, 2), FIV204: ["pastoral-visitation-and-care", "counselling-with-wisdom-and-boundaries", "church-discipline-and-restoration", "sustaining-a-long-ministry"],
  // ministry & leadership
  MIN102: ["pastoral-visitation-and-care", "grief-funerals-and-hope", "welcoming-newcomers-and-closing-the-back-door"], MIN201: ["preaching-and-teaching-the-word"],
  MIN104: ["leading-with-integrity-money-and-power", "caring-for-children-and-vulnerable-people"], MIN205: ["marriage-and-family-ministry", "counselling-with-wisdom-and-boundaries"],
  MIN204: ["children-and-youth-evangelism", "caring-for-children-and-vulnerable-people"], MIN303: ["grief-funerals-and-hope", "church-discipline-and-restoration"],
  MIN206: ["caring-for-children-and-vulnerable-people", "leading-with-integrity-money-and-power"], MIN208: ["counselling-with-wisdom-and-boundaries", "pastoral-visitation-and-care", "grief-funerals-and-hope", "marriage-and-family-ministry"],
  MIN209: ["grief-funerals-and-hope", "marriage-and-family-ministry"],
  LDR201: ["teams-and-co-workers"], LDR302: ["raising-and-releasing-leaders", "sustaining-a-long-ministry"], LDR203: ["ministry-finance-transparency"], LDR204: ["church-discipline-and-restoration", "accountability-and-the-jerusalem-council", "forgiveness-and-reconciliation"],
  // evangelism & missions
  CFN106: ["the-gospel-in-a-nutshell", "sharing-your-faith-naturally"], EVM101: ["the-gospel-in-a-nutshell", "sharing-your-faith-naturally", "repentance-and-faith"], EVM201: ["missions-and-the-unreached", "gospel-and-culture"],
  EVM202: ["follow-up-and-discipleship"], EVM204: ["answering-common-questions"], EVM205: ["planting-churches-the-pauline-way", "the-local-church-as-a-witnessing-community"],
  EVM206: ["mass-evangelism-and-crusades-wisely", "evangelism-in-the-marketplace-and-online"], EVM203: ["gospel-and-culture"],
  // foundations, doctrine, history
  CFN101: ["the-bible-gods-word", "god-the-trinity", "jesus-christ-lord-and-saviour"], CFN102: ["salvation-by-grace-through-faith", "baptism-and-the-lords-supper", "the-holy-spirit-baptism-and-filling"],
  CFN103: ["learning-to-pray"], CFN104: ["holy-living-and-spiritual-growth", "forgiveness-and-reconciliation"], CFN105: ["follow-up-and-discipleship", "how-to-study-the-bible", "the-church-gods-family"],
  THE101: ["god-the-trinity", "jesus-christ-lord-and-saviour", "salvation-by-grace-through-faith", "the-holy-spirit-baptism-and-filling", "hope-heaven-and-the-return-of-christ"], THE202: ["hope-heaven-and-the-return-of-christ"],
  THE203: ["the-protestant-reformation"], THE204: ["moravians-and-herrnhut", "the-great-awakening-and-the-wesleys", "welsh-revival-and-azusa-street", "revival-in-africa-harris-babalola-east-african", "korea-and-the-hebrides"],
  THE206: ["the-holy-spirit-baptism-and-filling", "pentecost-and-the-early-church", "hearing-gods-voice"], THE208: ["the-church-gods-family", "the-local-church-as-a-witnessing-community"],
  THE307: ["welsh-revival-and-azusa-street", "revival-in-africa-harris-babalola-east-african", "false-prophets-and-spiritual-abuse"],
  BIB104: ["how-to-study-the-bible"], BIB305: ["pentecost-and-the-early-church", "planting-churches-the-pauline-way", "accountability-and-the-jerusalem-council", "gospel-and-culture"],
  BIB306: ["the-prophetic-and-the-end-times", "hope-heaven-and-the-return-of-christ"], MIN207: ["intercession-and-the-prophetic-burden"],
  // kingdom enterprise
  KWE101: ["god-owns-everything-stewardship", "work-is-worship-and-calling", "giving-tithes-and-offerings"], KWE102: ["budgeting-saving-and-getting-out-of-debt"], KWE103: ["tent-making-ministry"],
  KWE104: ["starting-a-small-business-honestly"], KWE202: ["ministry-finance-transparency"], KWE203: ["avoiding-scams-and-get-rich-quick-schemes"], KWE205: ["work-is-worship-and-calling"],
  KWE301: ["savings-groups-and-community-enterprise"], KWE302: ["wealth-generosity-and-legacy"], KWE206: ["savings-groups-and-community-enterprise"], KWE207: ["avoiding-scams-and-get-rich-quick-schemes", "safety-and-privacy-online"],
  // technology hub
  TEC101: ["a-biblical-view-of-technology", "low-data-ministry-audio-and-offline"], TEC102: ["safety-and-privacy-online"], TEC103: ["church-media-live-streaming-audio"], TEC104: ["low-data-ministry-audio-and-offline"],
  TEC201: ["using-ai-tools-responsibly"], TEC202: ["websites-apps-and-social-media-for-churches"], TEC203: ["records-spreadsheets-and-church-administration", "safety-and-privacy-online"], TEC205: ["evangelism-in-the-marketplace-and-online"],
  TEC206: ["digital-skills-for-livelihood"], TEC207: ["how-to-study-the-bible", "using-ai-tools-responsibly"], TEC208: ["low-data-ministry-audio-and-offline", "church-media-live-streaming-audio"], RES202: ["using-ai-tools-responsibly"],
  // exegesis studies (worked passage examples) inside the Bible and theology courses
  BIB107: ["exegesis-a-method-you-can-use", "genesis-1-1-5-in-the-beginning"], BIB208: ["exegesis-a-method-you-can-use", "colossians-1-15-20-the-supremacy-of-christ", "matthew-5-1-12-the-beatitudes"],
  BIB201: ["genesis-1-1-5-in-the-beginning", "genesis-3-1-15-the-fall-and-the-first-promise", "exodus-3-1-15-the-burning-bush-and-the-name"], BIB203: ["psalm-23-the-lord-is-my-shepherd"], BIB210: ["psalm-23-the-lord-is-my-shepherd"],
  BIB204: ["isaiah-53-the-suffering-servant"], BIB205: ["matthew-5-1-12-the-beatitudes", "john-1-1-18-the-word-became-flesh"],
  BIB206: ["romans-3-21-26-the-righteousness-of-god", "romans-8-1-17-life-in-the-spirit", "ephesians-2-1-10-dead-made-alive", "philippians-2-5-11-the-mind-of-christ", "colossians-1-15-20-the-supremacy-of-christ"],
  BIB207: ["revelation-1-the-vision-of-the-risen-christ"],
  BIB301: ["exegesis-a-method-you-can-use", "john-1-1-18-the-word-became-flesh", "romans-3-21-26-the-righteousness-of-god", "romans-8-1-17-life-in-the-spirit", "philippians-2-5-11-the-mind-of-christ"],
  BIB302: ["ephesians-2-1-10-dead-made-alive", "colossians-1-15-20-the-supremacy-of-christ"], BIB303: ["matthew-5-1-12-the-beatitudes", "revelation-1-the-vision-of-the-risen-christ"],
  BIB304: ["isaiah-53-the-suffering-servant", "genesis-3-1-15-the-fall-and-the-first-promise", "psalm-23-the-lord-is-my-shepherd"],
  THE201: ["genesis-1-1-5-in-the-beginning", "genesis-3-1-15-the-fall-and-the-first-promise"],
  HEB301: ["genesis-1-1-5-in-the-beginning", "exodus-3-1-15-the-burning-bush-and-the-name", "isaiah-53-the-suffering-servant"], GRK301: ["john-1-1-18-the-word-became-flesh", "romans-3-21-26-the-righteousness-of-god", "philippians-2-5-11-the-mind-of-christ"],
};
