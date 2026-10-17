import type { QuestionSeed } from "./types";

/**
 * Hard Questions about Jesus Christ. Original FCGBS text. Historical and archaeological statements are limited to well-established
 * evidence, and debated points are labelled as debated. Scripture quoted from the KJV (public domain) or paraphrased.
 */
export const JESUS_QUESTIONS: QuestionSeed[] = [
  { slug: "genealogies-of-jesus-matthew-and-luke", category: "Jesus Christ", featured: true,
    title: "Why do Matthew and Luke give different genealogies of Jesus?",
    summary: "The two lists have different purposes and different routes from David. The best-supported answers are that Matthew gives Joseph's legal, royal line and Luke the line of natural descent (through Joseph's father by a levirate marriage, or through Mary). In every case Jesus is a true descendant of David and Abraham, and the Jechoniah curse is resolved by the virgin birth.",
    scriptures: ["Matthew 1:1-17", "Luke 3:23-38", "Jeremiah 22:24-30", "2 Samuel 7:12-16", "Romans 1:3", "1 Chronicles 3:17-19", "Deuteronomy 25:5-6"],
    readings: ["Richard Bauckham, Jesus and the Eyewitnesses (on names and traditions)", "Darrell Bock, Luke 1:1–9:50 (Baker Exegetical Commentary)", "R. T. France, The Gospel of Matthew (NICNT)", "Eusebius, Church History 1.7 (quoting Julius Africanus)"],
    exegetical: `## The two texts side by side
**Matthew 1:1–17** begins "The book of the generation of Jesus Christ, the son of David, the son of Abraham" (Matthew 1:1, KJV) and runs *forward* from Abraham to Jesus. It is arranged in three sets of fourteen generations: Abraham to David, David to the Babylonian exile, the exile to the Christ. It follows David's son **Solomon** and the line of the kings of Judah, passes through **Jechoniah** and **Zerubbabel**, and ends: "Jacob begat Joseph the husband of Mary, of whom was born Jesus, who is called Christ" (Matthew 1:16, KJV).

**Luke 3:23–38** runs *backward* from Jesus, after His baptism: "And Jesus himself began to be about thirty years of age, being (as was supposed) the son of Joseph, which was the son of Heli" (Luke 3:23, KJV). It follows David's son **Nathan**, not Solomon, passes through **Shealtiel (Salathiel)** and **Zerubbabel**, and continues past Abraham to **Adam, "which was the son of God"** (Luke 3:38).

## What actually differs
1. **Direction and starting point.** Matthew starts at Abraham (the covenant with Israel) and moves forward; Luke starts at Jesus and goes back to Adam (all humanity).
2. **Two sons of David.** Matthew goes through Solomon; Luke through Nathan (2 Samuel 5:14; 1 Chronicles 3:5).
3. **Joseph's father.** Matthew: Jacob. Luke: Heli.
4. **The meeting-point.** The two lines come together at Shealtiel and Zerubbabel, then separate again. Matthew makes Shealtiel the son of Jechoniah; Luke makes him the son of Neri.
5. **Length.** Matthew's list is deliberately shaped and abbreviated; Luke's is much longer.

## How "begat" works
The Greek verb *gennaō* in a genealogy means "was the ancestor of". Matthew skips names. For example "Joram begat Ozias" (Matthew 1:8, KJV) passes over Ahaziah, Joash and Amaziah, and "Josiah begat Jechonias" omits Jehoiakim (Matthew 1:11). Compare Ezra 7:1–5 with 1 Chronicles 6:3–14. Ancient genealogies were selective and often arranged by pattern, so "three sets of fourteen" is a literary device (in Hebrew letters used as numbers, the name David adds up to 14), not a claim that no one else existed. Matthew's list is not a modern birth certificate.

## Women in Matthew's list
Matthew names four women besides Mary: **Tamar, Rahab, Ruth and Bathsheba** ("her that had been the wife of Urias"). Each has a complicating story, and three were probably outside Israel by birth. Matthew prepares readers for a Messiah who comes through grace, and for a gospel that reaches the nations.

## "As was supposed"
Luke adds a pointed note: Jesus was "(as was supposed) the son of Joseph". Luke has just told of the virgin conception (Luke 1:26–38). His genealogy is therefore not claiming that Joseph fathered Jesus. It places Jesus legally in Joseph's family while the narrative has already told us He was conceived by the Holy Spirit.

## The Greek of Luke 3:23
In Greek, every name in Luke's list after Jesus is introduced by the same small word ("of", *tou*), but Joseph's name stands without it. Some scholars take this to mark Joseph as a special case, a link by legal adoption or marriage rather than birth. Others see no special weight in it. The sentence can be read either way, so it is a suggestion, not a proof.`,
    genealogical: `## The problem of Jechoniah
Jeremiah pronounced a judgement on Jechoniah (also called Coniah or Jehoiachin): "Thus saith the LORD, Write ye this man childless, a man that shall not prosper in his days: for no man of his seed shall prosper, sitting upon the throne of David, and ruling any more in Judah" (Jeremiah 22:30, KJV). Matthew places Jechoniah in Jesus' royal line. If Jesus were Joseph's biological son, He would inherit that curse; if He were not Joseph's biological son, He would still need a legal claim to David's throne. This is a key reason the virgin conception and two lines matter.

## Four main explanations (all ancient or traditional)
**1. Matthew gives Joseph's legal line; Luke gives the natural line (Julius Africanus).** Around AD 220, Julius Africanus (preserved by Eusebius) explained that the lists differ because of a *levirate marriage* (Deuteronomy 25:5–6): when a man died without a son, his brother married the widow and the first son was counted as the dead man's heir. On this view, Joseph's mother had been married first to one man and then to his half-brother, so that Joseph was the natural son of one (Jacob in Matthew, or Heli in Luke) and the legal heir of the other. That would account for two different "fathers" of Joseph. Africanus said he had this from the Lord's own relatives.

**2. Luke gives Mary's line.** Under this view, "Joseph, the son of Heli" means "Joseph, the son-in-law of Heli" (in Hebrew and Greek "son" is used for sons-in-law and descendants; compare Ezra 2:61). Heli would be Mary's father, Matthew would give Joseph's royal line, and Luke would give Jesus' biological line through His mother back to David through Nathan. This explanation avoids the Jechoniah problem: Jesus is not biologically Jechoniah's descendant, but He inherits the legal right through Joseph, who adopted Him as his own son by naming Him (Matthew 1:20–25). This is the view of many Protestant commentators from the sixteenth century.

**3. Matthew gives Joseph's royal succession and Luke Joseph's biological line (or the reverse).** A single family line with different successors, with Shealtiel and Zerubbabel appearing in both because of a levirate arrangement. Note that 1 Chronicles 3:17–19 itself shows that Shealtiel's family was complicated: it lists Zerubbabel as Pedaiah's son, yet other books call him Shealtiel's son, which is just the sort of levirate or legal adoption the explanation uses.

**4. The lists are theological portraits.** Some scholars hold that Matthew and Luke arranged traditional material to express theology, and that we cannot reconstruct every link. They still conclude that both writers held Jesus to be a genuine descendant of David.

## What we can say with confidence
- Both Gospels trace Jesus to **David** and **Abraham** (Matthew 1:1; Luke 3:31, 34).
- Both avoid saying Joseph was Jesus' biological father.
- Both lists were public in the first century, within a culture that valued genealogy. Luke and Matthew wrote when family members who knew the family were still alive.
- Neither explanation requires accepting a mistake in Scripture.`,
    archaeological: `## What the evidence shows
- **Jechoniah is a historical person.** Babylonian ration tablets from the time of Nebuchadnezzar (found at Babylon in the early twentieth century) list oil and grain for "Yaukin, king of Judah" and his five sons. This confirms the biblical report of Jehoiachin in exile (2 Kings 25:27–30).
- **The House of David.** The Tel Dan inscription (ninth century BC) mentions the "House of David", showing that David's dynasty was known beyond Israel.
- **Bethlehem.** Excavations in Jerusalem produced a clay seal impression naming "Bethlehem" (seventh century BC), and the town is mentioned in Micah 5:2 and Luke 2.
- **First-century family tradition.** Early Christian writer Hegesippus (second century, quoted by Eusebius) says that the relatives of Jesus descended from David were summoned before the emperor Domitian, which shows that Davidic descent was claimed and remembered. Josephus also states that priestly genealogies were kept in public records (*Life* 1), which supports the idea that family records were available.
- **The loss of records.** Africanus said that Herod destroyed the public genealogical records, and that families kept their own. We should not overstate that evidence, which comes from a later writer, but it explains why Gospel genealogies would rest on family memory.

## What archaeology cannot do
No inscription lists Jesus' ancestors. Archaeology confirms the world the genealogies belong to, not each name.`,
    apostolic: `## How the apostles used Jesus' descent
- **Paul:** Jesus "was made of the seed of David according to the flesh" (Romans 1:3, KJV). Timothy is told to "Remember that Jesus Christ of the seed of David was raised from the dead according to my gospel" (2 Timothy 2:8, KJV).
- **Peter at Pentecost:** David "being a prophet, and knowing that God had sworn with an oath to him, that of the fruit of his loins, according to the flesh, he would raise up Christ to sit on his throne" (Acts 2:30, KJV).
- **Hebrews:** "it is evident that our Lord sprang out of Juda" (Hebrews 7:14, KJV).
- **Revelation:** "the Lion of the tribe of Juda, the Root of David, hath prevailed" (Revelation 5:5, KJV).
Every apostolic witness treats Davidic descent as established, public and essential to the gospel.`,
    prophetic: `## The promises the genealogies fulfil
- **The seed of the woman** (Genesis 3:15): Luke's link to Adam points to the offspring who will crush the serpent.
- **The seed of Abraham** (Genesis 12:3; 22:18): Paul says the promise was to a single seed, "which is Christ" (Galatians 3:16).
- **The tribe of Judah** (Genesis 49:10).
- **David's throne**: "I will set up thy seed after thee... and I will stablish the throne of his kingdom for ever" (2 Samuel 7:12–13, KJV).
- **The shoot from Jesse** (Isaiah 11:1) and the "righteous Branch" (Jeremiah 23:5).
- **Bethlehem** (Micah 5:2).
Matthew's emphasis on kingship and Luke's emphasis on humanity answer different prophetic expectations: a king for Israel and a Saviour for all peoples.`,
    theological: `## Why God gave two genealogies
1. **Matthew shows Jesus as the Messiah-King.** He is the son of David, heir to the throne, and the son of Abraham through whom all nations are blessed. The shape of fourteen generations says: here is the new David. The women and the Gentile ancestry show grace.
2. **Luke shows Jesus as the Saviour of all.** By tracing back to Adam, and calling Adam "the son of God", Luke presents Jesus as the second Adam who succeeds where the first failed. It comes directly before the temptation in the wilderness (Luke 4).
3. **The virgin conception and the genealogies belong together.** Jesus is truly human (a real descendant of Adam, Abraham and David) and truly the Son of God (conceived by the Holy Spirit). Joseph gives Him the legal right to David's throne; the Spirit gives Him His divine origin.
4. **God works through broken families.** The lists include sinners, foreigners and failed kings. The Saviour enters history through a real, flawed human family.

## What to conclude
We do not need to know exactly how each link was recorded to trust the Gospels. We need to know that two careful writers, writing when the memory of the family was still alive, each gave a coherent genealogy, and that each form of explanation above resolves the supposed contradiction.`,
    views: `Faithful Christians hold different explanations:
- **Africanus's levirate view** (ancient).
- **The Mary-line view** (common among Protestants since the Reformation).
- **Matthew legal, Luke natural, both via Joseph.**
- **A literary and theological reading** that does not try to reconstruct every link.
All hold that Jesus was a descendant of David and that Scripture is trustworthy. Do not claim certainty where the evidence does not give it.`,
    pastoral: `When someone says, "The genealogies prove the Bible contradicts itself," answer calmly: there are well-known explanations, ancient and modern. Show that two writers with different purposes made different choices, that neither claims to give a complete list, and that the earliest Christians, who knew the family, accepted both. Invite the person to read Matthew 1 and Luke 3 side by side, noticing the differences and the purposes.` },

  { slug: "is-jesus-god-did-he-claim-it", category: "Jesus Christ", featured: true,
    title: "Is Jesus God? Did He ever claim to be?",
    summary: "Yes. Jesus claimed the divine name, divine authority, the power to forgive sins and the right to be worshipped, and the apostles taught plainly that He is God the Son, one with the Father, distinct from Him, and truly human. The evidence is in the Gospels, in the earliest letters and in non-Christian witnesses to Christian worship.",
    scriptures: ["John 1:1-18", "John 8:56-59", "John 10:27-39", "John 20:24-29", "Philippians 2:5-11", "Colossians 1:15-20", "Hebrews 1:1-4", "Isaiah 9:6-7", "Daniel 7:13-14", "Titus 2:13"],
    readings: ["Richard Bauckham, Jesus and the God of Israel", "Larry Hurtado, Lord Jesus Christ: Devotion to Jesus in Earliest Christianity", "N. T. Wright, The Resurrection of the Son of God"],
    exegetical: `## "Before Abraham was, I am"
Jesus told His opponents, "Verily, verily, I say unto you, Before Abraham was, I am" (John 8:58, KJV). The grammar is striking: not "I was" but "I am", the language of the divine name in Exodus 3:14. They understood exactly: "Then took they up stones to cast at him" (John 8:59, KJV) — the penalty for blasphemy.

## "I and my Father are one"
In John 10:30 Jesus said, "I and my Father are one" (John 10:30, KJV). His hearers again took up stones: "For a good work we stone thee not; but for blasphemy; and because that thou, being a man, makest thyself God" (John 10:33, KJV). Jesus does not correct them. He appeals to His works and says that "the Father is in me, and I in him" (10:38).

## Forgiving sins and receiving worship
When Jesus told a paralysed man, "Thy sins be forgiven thee", the scribes said, "Who can forgive sins but God only?" (Mark 2:5–7). Jesus did not say they misunderstood; He healed the man "that ye may know that the Son of man hath power on earth to forgive sins" (Mark 2:10, KJV). He accepted worship from the blind man (John 9:38), from the disciples (Matthew 14:33) and from Thomas, who said, "My Lord and my God" (John 20:28, KJV).

## The prologue of John
"In the beginning was the Word, and the Word was with God, and the Word was God... And the Word was made flesh, and dwelt among us" (John 1:1, 14, KJV). "With God" shows distinction; "was God" shows identity of nature; "made flesh" shows real humanity.

## The Son as the Father's image
"Who being in the form of God, thought it not robbery to be equal with God: But made himself of no reputation, and took upon him the form of a servant" (Philippians 2:6–7, KJV). Colossians 1:15–20 says that all things were created through and for Him; Hebrews 1:3 that He is "the brightness of his glory, and the express image of his person".

## "Son of Man"
His favourite self-description comes from Daniel 7:13–14, where one "like the Son of man" comes to the Ancient of Days and receives "dominion, and glory, and a kingdom, that all people, nations, and languages, should serve him". Before the high priest, Jesus applied it to Himself (Mark 14:62), and the priest tore his robes: he understood a claim to divine authority.

## Distinction within unity
The New Testament does not say that the Father and Son are the same person. The Son prays to the Father; the Father sends the Son; the Spirit proceeds from the Father and is sent by the Son. It speaks of one God in three persons (Matthew 28:19).`,
    genealogical: `Jesus is presented as both **Son of David** (Matthew 1:1) and **Son of God** (Luke 3:38; 1:35). The genealogies establish His true humanity and His place in Israel's story; the birth narratives establish His divine origin through the Holy Spirit. Luke places "Adam, which was the son of God" at the end of the list, showing that the link between God and humanity is restored in the second Adam.`,
    archaeological: `## Non-Christian witnesses to Christ-worship
- **Pliny the Younger** (governor in Bithynia, about AD 112) wrote to the emperor Trajan that Christians met before dawn "to sing a hymn to Christ as to a god" (*Letters* 10.96). This is a Roman official's report within about eighty years of Jesus' death.
- **The Alexamenos graffito.** A graffito from Rome, usually dated to the second or early third century, shows a man worshipping a crucified figure with a donkey's head, with the words "Alexamenos worships his god". It is a mocking witness that Christians worshipped the crucified Jesus as God.
- **Tacitus, Suetonius and Josephus** confirm that "Christus" was crucified under Pontius Pilate and that his followers formed a movement (Tacitus, *Annals* 15.44).

## Earliest manuscripts and creeds
- **Papyrus 52** (a fragment of John 18, about AD 125–150) shows John's Gospel circulating in Egypt within a generation or two of its writing. Papyrus 66 and 75 (about AD 175–225) contain John 1:1 and 1:18 with the high statements about Christ.
- **Early creed fragments** in the letters of Paul (for example Philippians 2:6–11 and 1 Corinthians 8:6) are generally dated within twenty years of the resurrection, showing devotion to Jesus alongside the one God from the earliest period.
- **Paul's Aramaic prayer** *Maranatha*, "Our Lord, come" (1 Corinthians 16:22), preserved in Aramaic, shows the earliest Palestinian believers addressing Jesus as Lord.`,
    apostolic: `The apostles consistently call Jesus God and Lord:
- **Thomas:** "My Lord and my God" (John 20:28, KJV).
- **Paul:** "of whom as concerning the flesh Christ came, who is over all, God blessed for ever" (Romans 9:5, KJV); "the great God and our Saviour Jesus Christ" (Titus 2:13, KJV).
- **Peter:** calls Jesus "our Lord and Saviour Jesus Christ" (2 Peter 1:11, KJV), and in 2 Peter 1:1 the Greek is widely read as "our God and Saviour Jesus Christ".
- **Hebrews:** "But unto the Son he saith, Thy throne, O God, is for ever and ever" (Hebrews 1:8, KJV).
- **John:** "This is the true God, and eternal life" (1 John 5:20, KJV).
The earliest Christians, who were strict monotheists, prayed to Jesus, sang to Him and baptised in His name along with the Father and the Spirit.`,
    prophetic: `The Old Testament promised a Messiah who would be more than a man:
- "For unto us a child is born, unto us a son is given... and his name shall be called Wonderful, Counsellor, The mighty God, The everlasting Father, The Prince of Peace" (Isaiah 9:6, KJV).
- Micah 5:2 speaks of a ruler "whose goings forth have been from of old, from everlasting".
- Psalm 110:1: "The LORD said unto my Lord, Sit thou at my right hand" — Jesus asked how David could call his descendant "Lord" (Matthew 22:41–45).
- Zechariah 12:10: "they shall look upon me whom they have pierced".
- Malachi 3:1: the LORD "shall suddenly come to his temple".
- Daniel 7:13–14, the Son of Man with eternal dominion.`,
    theological: `## One God, three persons
The church has confessed that there is one God in three persons, the Father, the Son and the Holy Spirit. The Council of Nicaea (AD 325) affirmed that the Son is "of one substance" with the Father against Arius, who taught that the Son was a created being. The Council of Chalcedon (AD 451) affirmed that Christ is one person in two natures, fully God and fully man, "without confusion, without change, without division, without separation".

## Why it matters
- **Salvation.** Only God can save; only a man can represent humanity. Jesus is both.
- **Worship.** If Jesus were not God, worshipping Him would be idolatry.
- **Revelation.** In Jesus we see what God is like (John 14:9).
- **Atonement.** The sacrifice of the Son of God has infinite worth.

## Answering common objections
- "Jesus said, 'The Father is greater than I'" (John 14:28). This refers to His role in the incarnation; Jesus speaks as the Son who has taken the form of a servant.
- "He prayed to God." Yes: the Son prays to the Father. The distinction of persons is not a denial of divinity.
- "The word 'Trinity' is not in the Bible." True; the word is a summary of what the Bible teaches in many places.`,
    views: `Christians who hold the Bible as authoritative agree that Jesus is God incarnate. Groups that deny it, such as Arians and Jehovah's Witnesses, do not accept the historic creeds and interpret key texts differently. Debates among believers concern how to explain the relationship (for example the eternal generation of the Son), not whether He is God.`,
    pastoral: `Answer questions with courtesy. Many people have never read the Gospels carefully. Invite them to read John's Gospel from beginning to end and notice what Jesus says about Himself, how people respond and why He was crucified.` },

  { slug: "virgin-birth-isaiah-7-14", category: "Jesus Christ",
    title: "Did the prophet really say 'virgin'? Isaiah 7:14 and the virgin birth",
    summary: "Isaiah's Hebrew word (*almah*) means a young woman of marriageable age, normally a virgin; the Greek translation made before Jesus' birth rendered it *parthenos* (virgin). Matthew sees a deeper fulfilment in the virgin conception of Jesus. The claim rests on both Gospels (Matthew and Luke), not on one word.",
    scriptures: ["Isaiah 7:1-17", "Matthew 1:18-25", "Luke 1:26-38", "Genesis 24:43", "Isaiah 9:6-7", "Galatians 4:4-5"],
    readings: ["Raymond Brown, The Birth of the Messiah", "Craig Blomberg, Matthew (NAC)", "J. Gresham Machen, The Virgin Birth of Christ"],
    exegetical: `## Isaiah's setting
Around 735 BC King Ahaz of Judah was afraid of an attack by Syria and Israel. Isaiah told him to ask for a sign. Ahaz refused out of false piety, so Isaiah said, "Therefore the Lord himself shall give you a sign; Behold, a virgin shall conceive, and bear a son, and shall call his name Immanuel" (Isaiah 7:14, KJV). Before the child knew to refuse evil and choose good, the two kings feared by Ahaz would be gone (7:16).

## The Hebrew word
The word is *'almah* (H5959). It describes a young woman of marriageable age, who in that society was presumed to be a virgin. The Hebrew word for a virgin in the strict sense is *bethulah* (H1330), which can also be used of a woman who is not a virgin (Joel 1:8). *'Almah* is used of Rebekah before her marriage (Genesis 24:43) and of Moses' sister Miriam (Exodus 2:8).

## The Greek translation
When Jewish scholars in Alexandria translated Isaiah into Greek (the Septuagint, in the second century BC, before Christianity), they used *parthenos* for *'almah* in Isaiah 7:14. *Parthenos* normally means "virgin". Some scholars have argued that it was a looser term then, but it shows that at least some Jewish readers understood Isaiah's child as born to a virgin.

## Matthew's use
After Joseph discovers that Mary is pregnant, Matthew says, "Now all this was done, that it might be fulfilled which was spoken of the Lord by the prophet, saying, Behold, a virgin shall be with child, and shall bring forth a son, and they shall call his name Emmanuel, which being interpreted is, God with us" (Matthew 1:22–23, KJV). Matthew's word "fulfilled" often means that the pattern of an earlier event finds its fullest meaning in Christ. Isaiah's child was a sign for Ahaz; Jesus is the greater sign, "God with us".

## Luke's independent account
Luke tells the story from Mary's side. The angel says, "The Holy Ghost shall come upon thee, and the power of the Highest shall overshadow thee: therefore also that holy thing which shall be born of thee shall be called the Son of God" (Luke 1:35, KJV). Mary asks, "How shall this be, seeing I know not a man?" (Luke 1:34). The belief that Jesus was conceived by the Spirit does not depend on a single verse in Isaiah.`,
    genealogical: `Matthew's genealogy ends not with "Joseph begat Jesus" but "Joseph the husband of Mary, of whom was born Jesus" (Matthew 1:16), changing the formula to signal that Jesus has no natural father. Luke's "as was supposed" (Luke 3:23) does the same. Joseph, by naming the child, took Him legally as his own (Matthew 1:21, 25), giving Him a place in David's line. See also the question on the genealogies of Jesus.`,
    archaeological: `Archaeology cannot confirm the conception itself. What it supports is the setting:
- **Nazareth** was a small village in Galilee in the first century, confirmed by excavations of simple houses, tombs and agricultural installations.
- **The Dead Sea Scrolls** include a complete Isaiah scroll (about 125 BC) that reads Isaiah 7:14 essentially as in later Hebrew texts, showing that the wording we have was fixed before Jesus' birth and not changed by Christians.
- **The Septuagint** manuscripts show *parthenos* in Isaiah 7:14 in copies transmitted by Jews and Christians.`,
    apostolic: `The apostles speak of the virgin conception less often than of the resurrection, but they presuppose it:
- Paul writes that "God sent forth his Son, made of a woman, made under the law" (Galatians 4:4, KJV), a careful phrase that avoids saying Jesus had a human father.
- John says the Word "was made flesh" (John 1:14) and speaks of those "born, not of blood, nor of the will of the flesh, nor of the will of man, but of God" (John 1:13).
- The earliest creeds confess Christ was "conceived by the Holy Spirit, born of the Virgin Mary".`,
    prophetic: `The prophetic pattern is of a sign given to the house of David, a child who is "God with us" (Isaiah 7:14), whose rule has no end (9:6–7), and who is the shoot from the stump of Jesse (11:1). The Old Testament also shows God overcoming barrenness and human impossibility to bring forth the promised seed: Sarah, Rebekah, Rachel, Hannah. The virgin conception is the greatest example of that pattern: God alone brings the promised Saviour.`,
    theological: `## Why the virgin conception matters
1. **Jesus is truly God and truly man.** He is born of a woman, so human; conceived by the Spirit, so the Son of God.
2. **Salvation is God's initiative.** The Saviour comes from heaven; He is not produced by human effort.
3. **It addresses the Jechoniah curse** (Jeremiah 22:30) as the line of Joseph's royal succession is not His biological line.
4. **It does not mean sex is sinful** or that Mary was sinless. It shows God's creative power.

## Answering the objection
- "Isaiah said *young woman*, not *virgin*." The word can mean either; context decides. In its first setting, Isaiah's sign needs only a young woman. Matthew sees a fuller meaning. The strongest evidence for the virgin conception is Matthew 1 and Luke 1, not a word study.
- "Pagan myths have virgin births." The Gospel accounts have no divine-human intercourse as in the myths; they are written in a Jewish setting, with the Holy Spirit's creative power.`,
    views: `Almost all historic Christian traditions affirm the virgin conception. Some critical scholars deny it. Christians differ about Mary's later life (Roman Catholic and Orthodox traditions teach her perpetual virginity; most Protestants hold that she and Joseph had other children, see the question on Jesus' brothers and sisters).`,
    pastoral: `Do not turn this into a quarrel about a Hebrew word. Read Luke 1 and Matthew 1 aloud, and ask what the writers want us to understand: that God has come to save His people in a way only He could.` },

  { slug: "jesus-brothers-and-sisters", category: "Jesus Christ",
    title: "Did Jesus have brothers and sisters? What about Mary's perpetual virginity?",
    summary: "The New Testament names Jesus' brothers (James, Joses, Simon, Judas) and speaks of sisters. Most Protestants understand them as Mary and Joseph's children born after Jesus; Roman Catholic and Orthodox traditions teach Mary's perpetual virginity and understand them as Joseph's sons by an earlier marriage (Orthodox) or as cousins or relatives (Catholic). Scripture's plainest reading favours younger siblings, and the issue is not a test of orthodoxy.",
    scriptures: ["Matthew 13:53-58", "Mark 6:1-6", "John 7:1-10", "Acts 1:12-14", "1 Corinthians 9:5", "Galatians 1:18-19", "Matthew 1:24-25", "Luke 2:7"],
    readings: ["Richard Bauckham, Jude and the Relatives of Jesus in the Early Church", "John P. Meier, A Marginal Jew, vol. 1 (chapter on the brothers)", "J. B. Lightfoot, The Brethren of the Lord"],
    exegetical: `## What the texts say
When Jesus taught in His home town, the people asked: "Is not this the carpenter's son? is not his mother called Mary? and his brethren, James, and Joses, and Simon, and Judas? And his sisters, are they not all with us?" (Matthew 13:55–56, KJV). Mark 6:3 calls Him "the carpenter, the son of Mary, the brother of James, and Joses, and of Juda, and Simon", and mentions sisters.

## The Greek words
The word *adelphos* ("brother") normally means a brother by birth. The New Testament has other words for cousin (*anepsios*, Colossians 4:10) and relatives (*syngenes*). Defenders of the "cousins" view point out that *adelphos* can also be used more widely (a fellow believer, a kinsman). The plain sense of the Gospels, however, is that these were Jesus' siblings.

## "Till she had brought forth"
Matthew says Joseph "knew her not till she had brought forth her firstborn son" (Matthew 1:25, KJV), and Luke calls Jesus "her firstborn son" (Luke 2:7). The Greek word *heos* ("till") usually implies that something changed afterwards, though it does not by itself prove it. "Firstborn" is the normal legal term and does not require later children.

## The brothers did not believe at first
"For neither did his brethren believe in him" (John 7:5, KJV). They later became believers: they are with the disciples in the upper room (Acts 1:14). James became a leader of the Jerusalem church (Acts 15; Galatians 1:19; 2:9) and wrote the letter of James. Jude wrote the letter of Jude, introducing himself as "the brother of James".

## Paul
Paul writes that he saw "James the Lord's brother" (Galatians 1:19, KJV), and says "the brethren of the Lord" were accompanied by their wives on mission (1 Corinthians 9:5).`,
    genealogical: `The ancient tradition has three accounts:
1. **Helvidian view** (named for fourth-century Helvidius): the brothers and sisters were children of Joseph and Mary born after Jesus.
2. **Epiphanian view:** they were children of Joseph by a former marriage (held by Epiphanius and many Orthodox Christians). This is found in the second-century *Protoevangelium of James*, an apocryphal text which is not Scripture.
3. **Hieronymian view** (Jerome): they were cousins, children of Mary of Clopas. Jerome developed this in the fourth century to defend Mary's perpetual virginity.
Mark 15:40 and John 19:25 list several Marys at the cross; the other Mary is the mother of James and Joses, which Jerome used in his argument. Others note that these James and Joses may be different people.`,
    archaeological: `- **The "James ossuary"** (a limestone burial box inscribed "James, son of Joseph, brother of Jesus") became famous in 2002, but its authenticity is disputed: the box is ancient, while the inscription's authenticity is contested and the Israel Antiquities Authority questioned it. It cannot be used as evidence.
- **First-century writers** corroborate that James was known as "the brother of Jesus who was called Christ": Josephus (*Antiquities* 20.200) mentions James's execution in AD 62 under the high priest Ananus. This is generally accepted as a genuine reference.
- **Hegesippus** (second century) tells of James's leadership and martyrdom and of the later leadership of Simeon, a relative of Jesus.`,
    apostolic: `James, the Lord's brother, was one of the "pillars" of the church (Galatians 2:9), presided at the Council of Jerusalem (Acts 15:13–21), and in his letter calls himself "a servant of God and of the Lord Jesus Christ" (James 1:1) — he does not boast of kinship. Paul lists James among those who saw the risen Christ (1 Corinthians 15:7). The apostles never use family ties to claim authority.`,
    prophetic: `Psalm 69:8 speaks prophetically of the rejected Messiah: "I am become a stranger unto my brethren, and an alien unto my mother's children" (KJV), which echoes John 7:5 and the initial rejection by His family. The later faith of James and Jude is part of the story of the redemption of a broken family.`,
    theological: `The doctrine of the virgin conception, not the perpetual virginity of Mary, is what the creeds affirm. Mary is honoured as the mother of Jesus (Luke 1:48), and her unique role in salvation history is affirmed by all traditions. Christians differ on whether she remained a virgin all her life, which is a tradition from the early church (second to fourth centuries) and not a clear New Testament teaching. The facts show Jesus' true humanity: He grew up in a family, with brothers and sisters who first misunderstood Him.`,
    views: `- **Most Protestants:** the brothers and sisters were younger children of Joseph and Mary.
- **Orthodox Christians:** they were Joseph's children by an earlier marriage.
- **Roman Catholics:** they were relatives, and Mary remained a virgin.
All three traditions affirm the virgin conception and Jesus' divinity. Honour Mary and do not use the issue to divide believers.`,
    pastoral: `Be gracious with Christians from other traditions. If a Catholic or Orthodox friend holds Mary's perpetual virginity, talk about what Scripture says and what the early church taught, and focus on the shared confession that Jesus is God and Lord.` },

  { slug: "why-have-you-forsaken-me", category: "Jesus Christ",
    title: "Why did Jesus cry, 'My God, my God, why hast thou forsaken me?'",
    summary: "Jesus quotes Psalm 22, a psalm of agony that ends in vindication. He experienced the full weight of human suffering and sin-bearing, yet the Father and Son were never separated in nature or purpose. The cry is real abandonment as sin-bearer and, at the same time, a quotation of a psalm of trust, announcing that deliverance will follow.",
    scriptures: ["Matthew 27:45-50", "Mark 15:33-39", "Psalms 22:1-31", "Isaiah 53:4-12", "2 Corinthians 5:21", "Galatians 3:13", "Hebrews 5:7-10"],
    readings: ["John Stott, The Cross of Christ", "Leon Morris, The Cross in the New Testament", "Derek Kidner, Psalms 1–72"],
    exegetical: `## The cry
"And about the ninth hour Jesus cried with a loud voice, saying, Eli, Eli, lama sabachthani? that is to say, My God, my God, why hast thou forsaken me?" (Matthew 27:46, KJV). Mark gives the same words in Aramaic. Jesus used the opening line of Psalm 22, which was well known to His hearers; by citing the opening, He invites the hearer to think of the whole psalm.

## Psalm 22
The psalm begins with a cry of abandonment and then describes the sufferer's torments: mockery ("All they that see me laugh me to scorn"), thirst, bones out of joint, pierced hands and feet, and men casting lots for his clothing (Psalm 22:7, 14–18). The Gospel accounts echo these details. The psalm then turns: "For he hath not despised nor abhorred the affliction of the afflicted... when he cried unto him, he heard" (22:24, KJV), and it ends with the nations turning to the LORD and a proclamation that "he hath done this" (22:31).

## Real or only apparent abandonment?
Two readings have been held together by most Christians:
- **Jesus really experienced the darkness of bearing sin.** "For he hath made him to be sin for us, who knew no sin; that we might be made the righteousness of God in him" (2 Corinthians 5:21, KJV). "Christ hath redeemed us from the curse of the law, being made a curse for us" (Galatians 3:13, KJV). The darkness over the land (Matthew 27:45) is a sign of judgement.
- **Jesus was still trusting the Father.** He cried, "My God"; He then said, "Father, into thy hands I commend my spirit" (Luke 23:46), and "It is finished" (John 19:30).
The Father did not cease to be Father, but the Son experienced the loss of the felt presence of God that sinners deserve.`,
    archaeological: `- **Crucifixion practice.** The discovery in 1968 at Giv'at ha-Mivtar in Jerusalem of the remains of a crucified man named Yehohanan, with an iron nail through the heel bone, confirms that crucifixion was practised in Judea in the first century. Details of interpretation are debated, but it is solid evidence.
- **Roman accounts of crucifixion** (Cicero, Josephus, Tacitus) describe the horror and shame of crucifixion.
- **Dead Sea Scrolls.** Fragments of Psalm 22 are preserved (including a copy with the controversial reading of 22:16, "they pierced my hands and feet", in a scroll from Nahal Hever) showing how the text was read before Christ.
- **Darkness at noon.** The ancient historian Thallus (preserved in later writers) mentioned a darkness and attributed it to an eclipse; the interpretation is debated, as an eclipse cannot occur at Passover full moon, so the testimony is not evidence for the Gospel account but shows that something unusual was remembered.`,
    apostolic: `- Peter: "Who his own self bare our sins in his own body on the tree, that we, being dead to sins, should live unto righteousness" (1 Peter 2:24, KJV).
- Paul: the cross is "the power of God" (1 Corinthians 1:18); Christ "gave himself for our sins" (Galatians 1:4).
- Hebrews: "who in the days of his flesh, when he had offered up prayers and supplications with strong crying and tears unto him that was able to save him from death, and was heard in that he feared" (Hebrews 5:7, KJV).
- The author of Hebrews says that Jesus was made perfect through sufferings and can sympathise with us (Hebrews 2:10, 17–18; 4:15).`,
    prophetic: `Psalm 22 and Isaiah 53 together describe the righteous sufferer who is rejected and killed, and whose death brings salvation. "Surely he hath borne our griefs, and carried our sorrows... he was wounded for our transgressions, he was bruised for our iniquities" (Isaiah 53:4–5, KJV). Zechariah 12:10 and 13:7 add the pierced one and the struck shepherd. The cry from the cross is not a failure of prophecy but its fulfilment.`,
    theological: `## What the cry teaches
1. **God enters our suffering.** The Son knows the darkest human experiences: pain, mockery, abandonment, death.
2. **Substitution.** He bore the judgement for sin that we deserved. The distance between God and sinners was borne by Christ.
3. **Trust in the dark.** Even in agony Jesus says "My God". Faith can pray in the language of lament.
4. **Hope.** The psalm ends in vindication, and the resurrection confirms it.
5. **The Trinity.** We should avoid saying that the Father stopped being God to the Son or that the Trinity was broken. Theologians speak of the Son's experience of judgement while the Father and Son remain united in purpose and love ("Therefore doth my Father love me, because I lay down my life", John 10:17).`,
    views: `Christians differ in emphasis. Some stress a real experience of divine judgement (many Reformed theologians); some emphasise that Jesus is voicing the pain of the whole psalm and the faith in which it ends; Eastern theology stresses that Christ shares human death to defeat it. All agree on the reality of His suffering and on His victory.`,
    pastoral: `This text gives people permission to bring pain and honest questions to God. For the person in grief, read Psalm 22 with them to the end, and note that the one who cried out has gone through the darkness and is risen. "For we have not an high priest which cannot be touched with the feeling of our infirmities" (Hebrews 4:15, KJV).` },

  { slug: "resurrection-accounts-and-evidence", category: "Jesus Christ", featured: true,
    title: "Do the resurrection accounts contradict each other? What is the evidence?",
    summary: "The four Gospels differ in who went to the tomb and what they saw, but they agree on the core: Jesus died, was buried, the tomb was found empty on the first day of the week, women were the first witnesses, and Jesus appeared alive to many. The differences are those of independent witnesses, and the earliest creed (1 Corinthians 15:3–8) predates the Gospels.",
    scriptures: ["1 Corinthians 15:1-20", "Matthew 28:1-20", "Mark 16:1-8", "Luke 24:1-53", "John 20:1-31", "Acts 2:22-36", "Acts 17:30-31"],
    readings: ["N. T. Wright, The Resurrection of the Son of God", "Gary Habermas and Michael Licona, The Case for the Resurrection of Jesus", "Richard Bauckham, Jesus and the Eyewitnesses", "Michael Licona, The Resurrection of Jesus: A New Historiographical Approach"],
    exegetical: `## What the Gospels agree on
1. Jesus was crucified, died and was buried (in a rock tomb belonging to Joseph of Arimathea).
2. On the first day of the week, women went to the tomb at dawn.
3. The tomb was empty; the stone had been moved.
4. The women (including Mary Magdalene) were told, or saw, that Jesus was risen.
5. The risen Jesus appeared to His disciples, who were transformed.

## Where they differ
- **Who went:** Matthew: Mary Magdalene and "the other Mary" (28:1). Mark: Mary Magdalene, Mary the mother of James, and Salome (16:1). Luke: the women from Galilee, including Joanna (24:10). John: Mary Magdalene (20:1), though she says "we" (20:2).
- **What they saw:** Matthew: an angel descending, rolling away the stone. Mark: a young man in white. Luke: two men in shining garments. John: two angels inside the tomb.
- **Where Jesus appeared:** Matthew and Mark point to Galilee; Luke and John emphasise Jerusalem (John also includes Galilee in chapter 21).
- **Time:** the accounts differ on exactly when the women arrived ("very early... at the rising of the sun").

## How to read the differences
1. **Independent witnesses.** Differences between eyewitness reports are expected. Perfectly matching accounts would suggest collusion.
2. **Selective summaries.** Each writer tells part of the story. Mentioning one woman does not deny the others; mentioning one angel does not deny a second (angels appear in various numbers in the Old Testament too). John mentions Mary Magdalene because he follows her story.
3. **A plausible harmony.** A group of women left together at dawn. Mary Magdalene, seeing the stone moved, ran to tell Peter and John (John 20:2). The other women entered, met the angels and were told to tell the disciples. Mary Magdalene returned and met Jesus (John 20:11–18). The disciples met Jesus in Jerusalem on Easter evening (Luke 24:36; John 20:19) and later in Galilee (Matthew 28:16; John 21).
4. **No claim of exhaustive detail.** The Gospel writers did not intend to produce a courtroom transcript.

## The earliest account
Paul wrote about AD 55 and passed on what he "received": "that Christ died for our sins according to the scriptures; And that he was buried, and that he rose again the third day according to the scriptures: And that he was seen of Cephas, then of the twelve: After that, he was seen of above five hundred brethren at once, of whom the greater part remain unto this present... After that, he was seen of James; then of all the apostles. And last of all he was seen of me also" (1 Corinthians 15:3–8, KJV). Most scholars date this creed to within a few years of the crucifixion.`,
    genealogical: `The witnesses are named: Cephas (Peter), the Twelve, James (Jesus' brother, who did not believe before), the five hundred, Paul (the persecutor), Mary Magdalene, Cleopas and others. Paul's reference to "the greater part remain unto this present" invites readers to question living witnesses.`,
    archaeological: `## Historical and material evidence
- **Crucifixion and burial in a tomb.** Rock-cut tombs with rolling stones are known in first-century Jerusalem (for example the Herodian family tomb). The 1968 discovery of the crucified man Yehohanan (a heel bone with an iron nail) shows that a crucified man could receive burial in a family tomb with an ossuary, which supports the Gospel claim that Jesus was buried.
- **Pontius Pilate.** The Pilate inscription (found in Caesarea in 1961) confirms that he governed Judea; Tacitus writes that Christ was executed under Pilate.
- **Caiaphas.** A burial box inscribed "Joseph son of Caiaphas" (found in Jerusalem in 1990) is widely accepted as belonging to the high priest's family.
- **The Nazareth Inscription.** A marble slab with an imperial decree against tomb robbery, said to have come from Nazareth (the details of its source and date are debated; most date it to the first century AD), has sometimes been linked to a reaction to the claims about an empty tomb. This link is speculation.
- **Non-Christian testimony.** Tacitus, Josephus, Pliny and later writers confirm that Christians believed Jesus rose and worshipped Him from the earliest period. Josephus's *Antiquities* 18.63–64 (the *Testimonium Flavianum*) in its original form is generally thought to have said that Jesus was crucified under Pilate and that his followers continued to revere him; scholars debate which phrases about the resurrection were added later.
- **No competing tomb.** No early source, Christian or hostile, claims to know the location of Jesus' body. The hostile story in Matthew 27:62–66; 28:11–15 (that the disciples stole the body) assumes that the tomb was empty.

## Historic sites
The Church of the Holy Sepulchre and the Garden Tomb are both venerated. The Church of the Holy Sepulchre is built on a site identified by the early Christian community and by Constantine's builders in the fourth century, and excavations show first-century quarrying and tombs beneath it. The Garden Tomb dates to a different period. Debate about sites does not affect the historical case for the event.`,
    apostolic: `The resurrection stands at the centre of apostolic preaching: "This Jesus hath God raised up, whereof we all are witnesses" (Acts 2:32, KJV). Paul reasons, "if Christ be not risen, then is our preaching vain, and your faith is also vain" (1 Corinthians 15:14, KJV). To be an apostle required being a witness of the resurrection (Acts 1:22). The apostles, who had fled in fear, became bold witnesses, and most of them suffered for their testimony.`,
    prophetic: `The resurrection is said to be "according to the scriptures" (1 Corinthians 15:4). Texts used by the apostles include Psalm 16:10 ("neither wilt thou suffer thine Holy One to see corruption", used by Peter in Acts 2:25–31), Psalm 110, Isaiah 53:10–12 and Hosea 6:2. Jesus Himself predicted His death and rising (Mark 8:31; 9:31; 10:34) and pointed to Jonah as a sign (Matthew 12:39–40).`,
    theological: `## What the resurrection means
1. **Vindication.** God declared Jesus to be "the Son of God with power, according to the spirit of holiness, by the resurrection from the dead" (Romans 1:4, KJV).
2. **Justification.** He "was delivered for our offences, and was raised again for our justification" (Romans 4:25, KJV).
3. **New creation.** Christ is "the firstfruits of them that slept" (1 Corinthians 15:20), pledge of our resurrection.
4. **Mission and hope.** The kingdom has begun; death has been defeated.

## The historical case in brief
Most historians, including many sceptics, grant that: Jesus died by crucifixion; His disciples sincerely believed they saw Him alive; the church began in Jerusalem soon afterwards; James and Paul, who had been opponents, became believers. The best explanation of the evidence, Christians argue, is that Jesus rose bodily from the dead. Alternative explanations (hallucination, swoon, theft, legend) each fail to account for all of the evidence.`,
    views: `Christians agree on the bodily resurrection. Some liberal scholars hold that the resurrection was a spiritual or visionary experience; this is a minority position among those who confess the creeds. Harmonisation of the details is offered as a plausible reconstruction, not as certain.`,
    pastoral: `Do not be anxious about the differences. Encourage the doubter to read each Gospel's resurrection chapter alone, then Paul's list in 1 Corinthians 15. Honest enquirers have found that the strongest argument is the sheer unlikelihood that a group of frightened Galileans would invent a story that cost them everything.` },

  { slug: "date-of-jesus-birth-and-quirinius-census", category: "Jesus Christ",
    title: "When was Jesus born? Was Quirinius really governor at the census?",
    summary: "Jesus was most likely born between about 6 and 4 BC, before the death of Herod the Great (which most date to 4 BC). December 25 is a later church tradition, not a Gospel date. Luke 2:1–2 has historical difficulties that scholars address in several ways (an earlier census under Quirinius or Saturninus, a rendering of 'before', or a registration separate from the later AD 6 census).",
    scriptures: ["Luke 2:1-7", "Matthew 2:1-23", "Luke 1:5", "Luke 3:1-2", "Micah 5:2"],
    readings: ["Darrell Bock, Luke 1:1–9:50", "Andreas Köstenberger and Justin Taylor, The Final Days of Jesus (on chronology)", "Harold Hoehner, Chronological Aspects of the Life of Christ", "Brian Rapske and others in Bible Background commentaries"],
    exegetical: `## What Luke says
"And it came to pass in those days, that there went out a decree from Cesar Augustus, that all the world should be taxed. (And this taxing was first made when Cyrenius was governor of Syria.) And all went to be taxed, every one into his own city" (Luke 2:1–3, KJV). Luke says that Joseph went from Nazareth to Bethlehem "because he was of the house and lineage of David" (2:4).

## The problem
The best-attested Roman census in Judea under **Quirinius** (Cyrenius) took place in **AD 6**, when Judea became a Roman province (Josephus, *Antiquities* 18.1–2). Herod the Great died in about 4 BC. Matthew puts Jesus' birth in Herod's reign; if Luke refers to the AD 6 census there seems to be a gap of about ten years.

## Proposed solutions
1. **A translation solution.** Luke 2:2 can be translated, "This was the registration before Quirinius was governor of Syria" (the Greek word *prōtē* can mean "before"; compare John 1:15, 30, where the same form means "before me"). Luke would be distinguishing an earlier registration from the well-known AD 6 one. The KJV renders it "first made".
2. **An earlier term for Quirinius.** Some historians propose that Quirinius had an earlier role in Syria around 8–6 BC (as a military commander), and that Luke uses a general term for governing ("ruling", *hēgemoneuō*). An inscription (the *Lapis Tiburtinus*) describes an official who governed Syria twice; whether it refers to Quirinius is disputed.
3. **A census under Saturninus.** Tertullian (about AD 200) said that the census in Judea was taken under Saturninus (governor of Syria, 9–6 BC).
4. **Luke made an error.** Some scholars conclude this. Defenders reply that Luke elsewhere is shown to be accurate with Roman officials and titles, for example Gallio in Acts 18:12 and the "politarchs" of Thessalonica in Acts 17:6, and that we do not have all the records.

## "All the world"
"All the world" means the Roman world. Augustus took several periodic registrations in the provinces (he himself recorded three in the *Res Gestae*), and registrations in Egypt are known from papyri. A local census in Herod's kingdom, a client state, is plausible (Josephus records that Herod's subjects swore an oath of loyalty to Augustus in about 7 BC).

## Why Bethlehem?
In Roman Egypt, papyri show that people were sometimes required to return to their home district for registration (a notice from AD 104 orders people to return to their own homes for the census). Luke's story fits the pattern of ancestral registration.`,
    genealogical: `Joseph is "of the house and lineage of David" (Luke 2:4). Bethlehem is "the city of David" (Luke 2:11). Matthew and Luke agree that Jesus was born in Bethlehem of Judea in the days of Herod (Matthew 2:1; Luke 1:5). See also the question on the genealogies.`,
    archaeological: `## Dates and rulers
- **Herod the Great** died shortly after a lunar eclipse in what most scholars calculate to be March 4 BC (Josephus, *Antiquities* 17.167), though a minority prefer 1 BC. This gives a latest date of about 4 BC for Jesus' birth.
- **Luke 3:1** dates the start of John the Baptist's ministry to "the fifteenth year of the reign of Tiberius Caesar", about AD 28–29. Jesus began "about thirty years of age" (Luke 3:23), which fits a birth between 6 and 4 BC.
- **Herod's building works** (Herodium, Caesarea, Masada, the Temple platform) are among the best-documented structures of the period and corroborate his paranoid and brutal reputation, consistent with Matthew's account of the massacre of the children of Bethlehem (a Bethlehem massacre is not mentioned by Josephus, perhaps because of the town's small size).
- **The star.** Astronomers have proposed various explanations (planetary conjunctions around 7 BC, a comet or nova), but none is certain. Matthew does not claim an ordinary astronomical event.
- **Nazareth.** Excavations have found simple first-century houses and agricultural remains, confirming a small Jewish village.
- **The census papyri.** Papyri from Roman Egypt show that censuses were held about every fourteen years and that people were ordered to return to their home districts.

## The date of December 25
The first evidence for celebrating Christmas on 25 December is in Rome in AD 336. The Gospels give no date. The shepherds' flocks "abiding in the field" (Luke 2:8) is sometimes taken to imply spring or autumn, though winter pasturing is possible. The date is a church tradition, not a Gospel claim.`,
    apostolic: `The apostles preach the incarnation, not the date: "when the fulness of the time was come, God sent forth his Son, made of a woman, made under the law" (Galatians 4:4, KJV). Paul cares that Jesus was born at the right moment in God's plan: Roman roads and peace, Greek language, Jewish synagogues across the empire.`,
    prophetic: `Micah 5:2 foretold the birthplace: "But thou, Bethlehem Ephratah, though thou be little among the thousands of Judah, yet out of thee shall he come forth unto me that is to be ruler in Israel; whose goings forth have been from of old, from everlasting" (Micah 5:2, KJV). The priests and scribes in Matthew 2:4–6 cited it. The census is how an unwilling emperor, unknowingly, placed the Messiah in the right town.`,
    theological: `Luke connects the birth of Jesus with the great world powers: Caesar Augustus, whose title included "saviour" and "son of god", and the baby in the manger, the true Saviour and Lord. God's plan works through imperial decrees and ordinary families. Our faith does not depend on solving every chronological puzzle, but history matters because God acted in history.`,
    views: `Scholars differ on Quirinius, with several serious solutions. Christians who accept Scripture as trustworthy see no need to claim certainty about the mechanism; they can note that Luke is a careful historian (Luke 1:1–4) and that the evidence from the period is fragmentary.`,
    pastoral: `When someone claims, "Luke got history wrong," respond with a calm summary: there are several reasonable solutions, Luke has been vindicated in many other details, and the date of the census does not change the message of the incarnation.` },
];
