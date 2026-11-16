/* Hebrew option. Loaded after the main script. Switching language stores a choice and reloads.
   Fighter names, nicknames, event names and rank tags stay in English on purpose. */
(function(){
"use strict";
var KEY="ufclang",LANG="en";
try{LANG=localStorage.getItem(KEY)==="he"?"he":"en"}catch(e){}
var HE=LANG==="he";
window.LANGHE=HE;
window.LOC=function(){return HE?"he-IL":undefined};

/* ---------- toggle ---------- */
function mkToggle(){
 function mk(cls){var b=document.createElement("button");b.type="button";b.className="lgtg "+cls;
  b.textContent=HE?"EN":"עב";
  b.setAttribute("aria-label",HE?"Switch to English":"החלפה לעברית");
  b.onclick=function(){try{localStorage.setItem(KEY,HE?"en":"he")}catch(e){}location.reload()};return b}
 var a=document.getElementById("acct");
 if(a&&a.parentNode){var w=document.createElement("div");w.className="lgrow";w.appendChild(mk("ac"));a.parentNode.insertBefore(w,a.nextSibling)}
 else document.body.appendChild(mk("top"));
 var n=document.querySelector("footer.lf nav");if(n)n.appendChild(mk("ft"));
}
if(document.body)mkToggle();else document.addEventListener("DOMContentLoaded",mkToggle);
if(!HE)return;

document.documentElement.lang="he";document.documentElement.dir="rtl";
document.title="סגל לוחמי UFC";
function fixH1(){var h=document.querySelector("#hc h1");if(h&&!h.dataset.he){h.dataset.he=1;h.innerHTML="<span>סגל</span> לוחמי UFC"}}

/* ---------- vocabulary (case-insensitive) ---------- */
var TM={
"well-rounded":"מאוזן","bjj":"BJJ","muay thai":"מואי תאי","boxing":"אגרוף","wrestling":"האבקות","kickboxing":"קיקבוקסינג","judo":"ג'ודו","karate":"קראטה","sambo":"סמבו","taekwondo":"טקוואנדו","greco-roman wrestling":"האבקות יוונית-רומית","greco-roman":"האבקות יוונית-רומית","dirty boxing":"אגרוף מלוכלך",
"fight iq":"אינטליגנציית קרב","iq":"אינטליגנציה","speed":"מהירות","cardio":"סיבולת לב-ריאה","striking":"סטרייקינג","quick reactions":"תגובות מהירות","fight control":"שליטה בקרב","adaptability":"יכולת הסתגלות","brawler":"קרבות אגרוף","brawlers":"לוחמי קרב אגרוף","brawls":"קרבות רחוב","wrestling defense":"הגנה מהאבקות","defensive wrestling":"הגנה מהאבקות","chin":"סנטר","grappling":"גראפלינג","power":"עוצמה","counter striking":"סטרייקינג נגד","counter-striking":"סטרייקינג נגד","combos":"קומבינציות","combinations":"קומבינציות","boxing combinations":"קומבינציות אגרוף","submissions":"חניקות ונעילות","kicks":"בעיטות","creative striking":"סטרייקינג יצירתי","footwork":"עבודת רגליים","defense":"הגנה","striking defense":"הגנת סטרייקינג","pressure":"לחץ","grappling defense":"הגנת גראפלינג","reach":"טווח ידיים","sniper":"צלף","snipers":"צלפים","technical striking":"סטרייקינג טכני","defensive bjj":"הגנת BJJ","offensive bjj":"התקפת BJJ","offensive wrestling":"התקפת האבקות","leg kicks":"בעיטות רגליים","ground and pound":"גראונד אנד פאונד","creative elbows":"מרפקים יצירתיים","elbows":"מרפקים","strength":"כוח","knees":"ברכיים","counter puncher":"מכה נגד","counter punchers":"מכי נגד","pressure striking":"סטרייקינג בלחץ","offensive grappling":"התקפת גראפלינג","size":"גודל","technical boxing":"אגרוף טכני","head kicks":"בעיטות לראש","clinch fighting":"לחימה בקלינץ'","clinch defense":"הגנה בקלינץ'","wild/unorthodox striking":"סטרייקינג פרוע/לא שגרתי","physical strength":"כוח פיזי","offensive striking":"התקפת סטרייקינג","weird":"משונה","elbows and knees":"מרפקים וברכיים","strong":"חזק","striking offense":"התקפת סטרייקינג","gets up":"קם מהר","ragebait / mental warfare":"הפרעת ריכוז / לוחמה מנטלית","ragebait":"הפרעת ריכוז",
"gets hit a lot":"חוטף הרבה מכות","not a technical striker":"לא סטרייקר טכני","can be wild":"יכול להיות פרוע","counter strikers":"סטרייקרים נגד","slow starts":"פתיחות איטיות","late-round cardio":"סיבולת בסיבובים מאוחרים","too nerdy (thinks too much)":"חושב יותר מדי","low output":"תפוקה נמוכה","power punchers":"בעלי אגרוף חזק","old":"מבוגר","leg kicks (maybe)":"בעיטות רגליים (אולי)","chin not as good anymore":"הסנטר כבר לא כמו פעם","chin (not as good)":"סנטר (לא כמו פעם)","finishing ability":"יכולת סיום","ability to finish fights":"יכולת לסיים קרבות","pressure fighters":"לוחמי לחץ","power merchants":"בעלי עוצמה","defensive grappling":"הגנת גראפלינג","ego":"אגו","anti-wrestlers":"אנטי-מתאבקים","technical strikers":"סטרייקרים טכניים","grapplers":"גראפלרים","kicks to the body":"בעיטות לגוף","cardio (probably)":"סיבולת (כנראה)","mma experience":"ניסיון ב-MMA","wrestlers":"מתאבקים","freezes":"קופא","lacks technical striking":"חסרות לו סטרייקינג טכני","his knees":"הברכיים שלו","anti-wrestling strikers":"סטרייקרים נגד מתאבקים","boxing defense":"הגנת אגרוף","injuries":"פציעות","past his prime":"אחרי שיא הקריירה","defensive grappling under sustained pressure":"הגנת גראפלינג תחת לחץ מתמשך","no experience":"חוסר ניסיון","age":"גיל","reckless":"פזיז","boxers with a long reach":"מתאגרפים עם טווח ידיים ארוך","fast fighters":"לוחמים מהירים","slow":"איטי","slow footwork":"עבודת רגליים איטית","lazy":"עצלן","strikers":"סטרייקרים",


"general highlights":"קטעי שיא כלליים"
};

/* ---------- exact UI strings ---------- */
var X={
"Hot take":"דעה חמה","Comments":"תגובות","Post":"פרסום","Write a comment…":"כתבו תגובה…","No comments yet. Be the first.":"אין תגובות עדיין. היו הראשונים.","just now":"הרגע","Delete":"מחיקה","Could not delete the comment.":"לא ניתן היה למחוק את התגובה.","Shop":"חנות","Emojis, color themes & stickers":"אימוג'ים, ערכות צבעים ומדבקות","Emojis, color themes &amp; stickers":"אימוג'ים, ערכות צבעים ומדבקות","Your wallet":"הארנק שלכם","Spending coins does not lower your rank.":"הוצאת מטבעות לא מורידה את הדירוג שלכם.","Reaction emojis":"אימוג'י תגובה","Use them to react to other players' picks.":"השתמשו בהם כדי להגיב לבחירות של שחקנים אחרים.","Color themes":"ערכות צבעים","Stickers":"מדבקות","A sticker sits next to your name for everyone to see.":"מדבקה מופיעה ליד השם שלכם לעיני כולם.","Owned":"בבעלותכם","In use":"בשימוש","Use":"שימוש","Red":"אדום","Pink":"ורוד","Blue":"כחול","Green":"ירוק","Like":"לייק","Thumbs up":"אגודל למעלה","Fire":"אש","Laugh":"צחוק","Clap":"מחיאות כפיים","Eyes":"עיניים","Skull":"גולגולת","Clown":"ליצן","Shocked":"הלם","Ice cold":"קר כקרח","Rocket":"רקטה","Crown":"כתר","Goat":"עז","React":"הגיבו","Remove my reaction":"הסרת התגובה שלי","More emojis are in the Shop on the home screen.":"עוד אימוג'ים בחנות במסך הבית.","Log in to use the shop.":"התחברו כדי להשתמש בחנות.","The shop is not open yet.":"החנות עדיין לא נפתחה.","Not enough coins.":"אין מספיק מטבעות.","You already own this.":"כבר יש לכם את זה.","Gift":"מתנה","complete!":"הושלמה!","Your gift: 100 coins added to your total.":"המתנה שלכם: 100 מטבעות נוספו לסך שלכם.","Collect":"קבלו","🎉 GOAT list complete! +100 coins added.":"🎉 רשימת ה-GOAT הושלמה! נוספו 100 מטבעות.","Fill all 20 spots for the first time and get 100 coins.":"מלאו את כל 20 המקומות בפעם הראשונה וקבלו 100 מטבעות.","🔔 Notifications":"🔔 התראות","🔔 Notifications: on":"🔔 התראות: פעילות","Notifications":"התראות","Turn on notifications":"הפעלת התראות","Turn off notifications":"כיבוי התראות",
"On iPhone: first tap Share, then Add to Home Screen, open the app from your Home Screen, and turn notifications on there.":"באייפון: קודם לחצו על שיתוף ואז על הוספה למסך הבית, פתחו את האפליקציה ממסך הבית והפעילו שם את ההתראות.",
"This browser does not support notifications.":"הדפדפן הזה לא תומך בהתראות.",
"Notifications are blocked for this site. Allow them in your browser or phone settings, then try again.":"ההתראות חסומות לאתר הזה. אפשרו אותן בהגדרות הדפדפן או הטלפון ונסו שוב.",
"You will get a message when picks open, 1 hour before they lock, and when results are in. Tap to turn off.":"תקבלו הודעה כשהבחירות נפתחות, שעה לפני שהן ננעלות וכשהתוצאות מוכנות. לחצו כדי לכבות.",
"Get a message when picks open, 1 hour before they lock, and when results are in.":"קבלו הודעה כשהבחירות נפתחות, שעה לפני שהן ננעלות וכשהתוצאות מוכנות.",
"Could not change notifications:":"לא ניתן היה לשנות את ההתראות:","✎ Edit list":"✎ עריכת הרשימה","Done":"סיום","Tap a square to add or change a fighter.":"לחצו על ריבוע כדי להוסיף או להחליף לוחם.","Tap a fighter to open their profile.":"לחצו על לוחם כדי לפתוח את הפרופיל שלו.","Move earlier":"הזזה קדימה","Move later":"הזזה אחורה","Your top 20 fighters of all time":"20 הלוחמים הטובים בכל הזמנים שלכם","You have not built your GOAT list yet. Open the GOAT list page from the home screen.":"עוד לא בניתם רשימת GOAT. פתחו את דף רשימת ה-GOAT ממסך הבית.","GOAT list":"רשימת ה-GOAT","My GOAT list":"רשימת ה-GOAT שלי","Add a fighter":"הוספת לוחם","Move up":"הזזה למעלה","Move down":"הזזה למטה","Remove":"הסרה","Search a fighter":"חיפוש לוחם","No match.":"אין תוצאות.","not on the site":"לא באתר","No GOAT list yet.":"אין עדיין רשימת GOAT.","You have not built your GOAT list yet. Open Scoreboard, then the GOAT list tab.":"עוד לא בניתם רשימת GOAT. פתחו את לוח התוצאות ואז את הלשונית רשימת GOAT.","Log in to build your GOAT list: your top 20 fighters of all time.":"התחברו כדי לבנות את רשימת ה-GOAT שלכם: 20 הלוחמים הטובים בכל הזמנים.","Saved on this device only for now. Other players cannot see your list yet.":"נשמר כרגע רק במכשיר הזה. שחקנים אחרים עדיין לא רואים את הרשימה שלכם.","Your top 20 fighters of all time.":"20 הלוחמים הטובים בכל הזמנים שלכם.","Scroll to bring the fighters to life":"גללו כדי להעיר את הלוחמים לחיים","Scroll ↓":"גללו ↓","Fighter":"סגל","profile":"שלכם","Your":"הפרופיל","Fight":"ערב","night":"קרבות","roster":"הלוחמים",
"Logged in with your Claude account":"מחוברים עם חשבון Claude","Coins":"מטבעות","Picks ›":"בחירות ‹","Rank ›":"דירוג ‹","Picks":"בחירות","Rank":"דירוג","📲 Install the app":"📲 התקנת האפליקציה",
"This week's picks":"הבחירות של השבוע","Scoreboard":"לוח תוצאות","Scoreboard, last week & past events":"לוח תוצאות, השבוע שעבר ואירועים קודמים","Scoreboard, last week &amp; past events":"לוח תוצאות, השבוע שעבר ואירועים קודמים",
"‹ Back":"› הקודם","Back":"חזרה","‹":"›","›":"‹",
"Search fighter":"חיפוש לוחם","Search fighters":"חיפוש לוחמים","Previous class":"משקל קודם","Next class":"משקל הבא","Previous fighter":"הלוחם הקודם","Next fighter":"הלוחם הבא","Close":"סגירה","Close zoom":"סגירת הזום","Legal":"מידע משפטי","Zoomed resume picture":"תמונת קורות החיים מוגדלת","Zoomed resume":"תמונת קורות החיים מוגדלת",
"Fighter details and images come from your document. Rank tags are from the UFC's official rankings (Oct 27 to Nov 3, 2026 polls).":"פרטי הלוחמים והתמונות מגיעים מהמסמך שלך. תגי הדירוג לקוחים מדירוג ה-UFC הרשמי (סקרי 27 באוקטובר עד 3 בנובמבר 2026).",
"Unofficial fan project. Not affiliated with, endorsed by or sponsored by UFC or any fighter. Names, logos and images belong to their owners. Coins are virtual and have no cash value.":"פרויקט מעריצים לא רשמי. אין קשר ל-UFC או לאחד הלוחמים, והוא אינו מאושר או ממומן על ידם. השמות, הלוגואים והתמונות שייכים לבעליהם. המטבעות וירטואליים ואין להם ערך כספי.",
"© 2026 UFC Fighter Roster fan site":"© 2026 אתר מעריצים סגל לוחמי UFC",
"Terms":"תנאי שימוש","Privacy":"פרטיות","Privacy Policy":"מדיניות הפרטיות","Copyright":"זכויות יוצרים","Contact":"יצירת קשר",
"Open this page while signed in to claude.ai to log in, pick winners and earn coins.":"פתחו את הדף כשאתם מחוברים ל-claude.ai כדי להתחבר, לבחור מנצחים ולהרוויח מטבעות.",
"Connecting…":"מתחבר…","Settings":"הגדרות","Log out":"התנתקות","Delete account":"מחיקת חשבון","Join the game":"הצטרפו למשחק","Pick winners, earn coins, climb the scoreboard":"בחרו מנצחים, הרוויחו מטבעות וטפסו בלוח התוצאות",
"right winner":"מנצח נכון","right method":"שיטה נכונה","right round":"סיבוב נכון","main event":"קרב ראשי","+100 coins":"\u200e+100 מטבעות","+50 coins":"\u200e+50 מטבעות","2x":"פי 2",
"Log in":"התחברות","Create account":"יצירת חשבון","Email":"אימייל","Display name":"שם תצוגה","Password":"סיסמה","Show":"הצגה","Hide":"הסתרה","6+ characters":"6 תווים לפחות","Shown on the scoreboard":"יוצג בלוח התוצאות",
"By creating an account you confirm you are 16 or older and agree to the":"בפתיחת חשבון אתם מאשרים שאתם בני 16 ומעלה ומסכימים ל",
"and":"ול","Enter an email and a password of 6+ characters.":"הזינו אימייל וסיסמה של 6 תווים לפחות.","Check your email to confirm your account, then log in.":"בדקו את תיבת הדוא\"ל כדי לאשר את החשבון ואז התחברו.",
"Invalid login credentials":"פרטי ההתחברות שגויים","Email not confirmed":"האימייל עדיין לא אושר","User already registered":"המשתמש כבר רשום",
"Delete your account permanently? Your login, display name and all your picks and coins will be erased. This cannot be undone.":"למחוק את החשבון לצמיתות? ההתחברות, שם התצוגה וכל הבחירות והמטבעות שלכם יימחקו. אי אפשר לבטל את הפעולה.",
"Could not delete the account:":"לא ניתן היה למחוק את החשבון:",
"Change password":"שינוי סיסמה","New password (6+ characters)":"סיסמה חדשה (6 תווים לפחות)","Repeat new password":"חזרו על הסיסמה החדשה","Use at least 6 characters.":"השתמשו ב-6 תווים לפחות.","The two passwords don't match.":"שתי הסיסמאות אינן תואמות.","Password changed.":"הסיסמה שונתה.","Install the app":"התקנת האפליקציה","Fight fan":"אוהד קרבות",
"The app is installed on this device.":"האפליקציה מותקנת במכשיר הזה.","The app is already installed on this device.":"האפליקציה כבר מותקנת במכשיר הזה.",
"On iPhone or iPad: tap the Share button in Safari, then":"באייפון או באייפד: לחצו על כפתור השיתוף ב-Safari ואז","Add to Home Screen":"הוספה למסך הבית","In your browser menu, choose":"בתפריט הדפדפן בחרו","Install app":"התקנת אפליקציה","Add to Home screen":"הוספה למסך הבית",
"Tap Install":"לחצו על התקנה","Install":"התקנה",
"On iPhone or iPad (use":"באייפון או באייפד (השתמשו ב","Safari":"Safari","1. Tap the":"1. לחצו על כפתור","Share":"שיתוף","2. Scroll down and tap":"2. גללו למטה ולחצו על","3. Tap":"3. לחצו על","Add":"הוספה","On Android (Chrome): open the":"באנדרואיד (Chrome): פתחו את","⋮ menu":"תפריט ⋮","On a computer (Chrome or Edge): click the install icon at the right end of the address bar.":"במחשב (Chrome או Edge): לחצו על סמל ההתקנה בקצה שורת הכתובת.",
"Compare fighters":"השוואת לוחמים","Pick a fighter":"בחרו לוחם","Search a fighter to compare":"חפשו לוחם להשוואה","Change fighter…":"החלפת לוחם…","Record":"מאזן","Rank / status":"דירוג / סטטוס","Weight class":"משקל","Style":"סגנון",
"⚖ Compare strengths & weaknesses":"⚖ השוואת חוזקות וחולשות","⚖ Compare with another fighter":"⚖ השוואה ללוחם אחר","⚖ Compare strengths &amp; weaknesses":"⚖ השוואת חוזקות וחולשות",
"🔍 Hold the resume picture to zoom":"🔍 החזיקו על תמונת קורות החיים כדי להגדיל","Pinch or scroll to zoom · drag to move · double-tap to reset":"צביטה או גלילה לזום · גררו להזזה · לחיצה כפולה לאיפוס",
"Resume picture coming soon":"תמונת קורות חיים בקרוב","MMA base":"בסיס ב-MMA","Strengths":"חוזקות","Weaknesses":"חולשות","Most-watch fights":"הקרבות הנצפים ביותר","Highlights":"קטעי שיא","Full fights":"קרבות מלאים","Pro MMA record (W-L-D)":"מאזן MMA מקצועי (ניצחונות-הפסדים-תיקו)","View profile":"צפייה בפרופיל","No profile yet":"אין פרופיל עדיין","No profile on this site":"אין פרופיל באתר",
"Last week":"השבוע שעבר","Next week":"השבוע הבא","Recent events":"אירועים אחרונים","Past events":"אירועים קודמים","Main card":"הקלף המרכזי","Fights":"קרבות","Main event":"קרב ראשי","Co-main":"קרב משנה","Title fight":"קרב אליפות",
"Won":"ניצח","Lost":"הפסיד","Draw":"תיקו","No contest":"ללא תוצאה","DRAW":"תיקו","NC":"ללא תוצאה","DEC":"DEC","SUB":"SUB","KO/TKO":"KO/TKO",
"How?":"איך?","Round":"סיבוב","wins by":"ינצח ב~","in round":"בסיבוב","by":"בשיטת","in":"ב~","Saved.":"נשמר.","Tap to pick":"לחצו לבחירה","Tap to pick the winner":"לחצו לבחירת המנצח","Picks locked":"הבחירות נעולות","Picks are locked":"הבחירות נעולות","Change pick":"שינוי בחירה","Your pick":"הבחירה שלכם","✓ Your pick":"✓ הבחירה שלכם","✓ You picked":"✓ בחרתם","✓ Pick":"✓ בחירה","✓ Correct":"✓ נכון","✗ Wrong":"✗ שגוי","No coins":"בלי מטבעות","Waiting for the result":"ממתין לתוצאה","Not finished yet":"עדיין לא הסתיים","Pick:":"בחירה:","Your pick:":"הבחירה שלכם:","You didn't pick this fight":"לא בחרתם בקרב הזה","Tap to see both fighters ›":"לחצו כדי לראות את שני הלוחמים ‹",
"👆 Tap the fighter you think will win.":"👆 לחצו על הלוחם שלדעתכם ינצח.","1 · Winner":"1 · מנצח","2 · How":"2 · איך","3 · Round":"3 · סיבוב","1 · Winner ✓":"1 · מנצח ✓","2 · How ✓":"2 · איך ✓","3 · Round ✓":"3 · סיבוב ✓","Now choose":"עכשיו בחרו","Almost done: choose the":"כמעט סיימתם: בחרו את ה",
"Picks are locked for this event (they lock 5 hours before the fights).":"הבחירות נעולות לאירוע הזה (הן ננעלות 5 שעות לפני הקרבות).",
"Couldn't save your pick. You may need contributor access to this page.":"לא ניתן היה לשמור את הבחירה. ייתכן שנדרשת הרשאת עריכה לדף הזה.",
"⏰ Wake me up":"⏰ תעירו אותי","How \"Wake me up\" works":"איך עובד \"תעירו אותי\"","iPhone:":"אייפון:","sets a real Clock alarm that rings even on silent. One-time setup:":"מגדיר התראה אמיתית בשעון שמצלצלת גם במצב שקט. הגדרה חד-פעמית:","Open the":"פתחו את אפליקציית","Shortcuts":"קיצורי דרך","app, tap":"ולחצו על","and name the shortcut exactly":"ותנו לקיצור בדיוק את השם","UFC Alarm":"UFC Alarm","Add the action":"הוסיפו את הפעולה","Get Dates from Input":"Get Dates from Input","Create Alarm":"Create Alarm","Dates":"Dates",", set its time to the":", הגדירו את השעה לפי","result from the step above, and turn its label on.":"התוצאה מהשלב הקודם והפעילו את התווית.",
"Done. You get one alarm: on time for the first main-card fight, and 20 minutes before the estimated start for every other fight.":"סיימתם. תקבלו התראה אחת: בזמן לקרב הראשון בקלף המרכזי, ו-20 דקות לפני ההתחלה המשוערת של כל קרב אחר.",
"Android and other phones:":"אנדרואיד וטלפונים אחרים:","downloads a calendar file with one alarm, timed the same way. Open it to add it to your calendar.":"מוריד קובץ יומן עם התראה אחת, בזמן זהה. פתחו אותו כדי להוסיף ליומן.",
"Start times are estimates. Edit the alarm if the schedule changes.":"זמני ההתחלה הם הערכה. ערכו את ההתראה אם לוח הזמנים משתנה.",
"Alarm file downloaded. Open it to add the alarms (1 hour, 30, 10 min and at the start) to your phone calendar. Start time is an estimate.":"קובץ ההתראות ירד. פתחו אותו כדי להוסיף ליומן בטלפון את ההתראות (שעה, 30 ו-10 דקות לפני ובזמן ההתחלה). זמן ההתחלה הוא הערכה.",
". If nothing happens, finish the one-time setup below first.":". אם לא קורה כלום, סיימו קודם את ההגדרה החד-פעמית למטה.",
"Players · tap a name to see their picks":"שחקנים · לחצו על שם כדי לראות את הבחירות","Players' picks":"הבחירות של השחקנים","Players":"שחקנים",
"No picks yet. Be the first to pick a winner.":"אין בחירות עדיין. היו הראשונים לבחור מנצח.",
"Right winner: 100 coins · right method: +50 · right round: +50 (a right decision pick gets the round bonus too) · main event pays double.":"מנצח נכון: 100 מטבעות · שיטה נכונה: עוד 50 · סיבוב נכון: עוד 50 (בחירה נכונה של הכרעה מקבלת גם את בונוס הסיבוב) · הקרב הראשי משלם כפול.",
"This player keeps their picks private.":"השחקן הזה שומר את הבחירות שלו בפרטיות.","Their picks stay hidden until each fight is over.":"הבחירות שלו נשארות מוסתרות עד שכל קרב מסתיים.","No picks yet.":"אין בחירות עדיין.","Picks for fights that are not over yet stay hidden.":"בחירות לקרבות שעדיין לא הסתיימו נשארות מוסתרות.",
"made · hidden until the fights are over":"בוצעו · מוסתרות עד שהקרבות מסתיימים","Other players' picks show up here as each fight finishes.":"הבחירות של שחקנים אחרים יופיעו כאן עם סיום כל קרב.",
"Picks for this card open once it becomes the week's event.":"הבחירות לקלף הזה ייפתחו כשהוא יהפוך לאירוע השבוע.","The card after this week is not announced yet. It shows up here as soon as it is.":"הקלף שאחרי השבוע הזה עדיין לא הוכרז. הוא יופיע כאן ברגע שיוכרז.","No past events yet. They appear here after the next update runs.":"אין אירועים קודמים עדיין. הם יופיעו כאן אחרי העדכון הבא.",
"Last week:":"השבוע שעבר:","Result:":"תוצאה:","· no coins":"· בלי מטבעות","Loading…":"טוען…","Enter":"כניסה","Save":"שמירה","Cancel":"ביטול","OK":"אישור",
"Picks lock":"הבחירות ננעלות","Main card":"הקלף המרכזי","your time":"לפי השעה שלכם","(5 hours before the fights)":"(5 שעות לפני הקרבות)","official, ufc.com":"רשמי, ufc.com","estimate":"הערכה","picks locked":"הבחירות נעולות","🔒 locked":"🔒 נעול","2x coins":"מטבעות כפולים","no coins":"בלי מטבעות","LIVE":"בשידור חי","Live":"בשידור חי"
};

/* ---------- dates ---------- */
var DAYS={Mon:"שני",Tue:"שלישי",Wed:"רביעי",Thu:"חמישי",Fri:"שישי",Sat:"שבת",Sun:"ראשון",Monday:"שני",Tuesday:"שלישי",Wednesday:"רביעי",Thursday:"חמישי",Friday:"שישי",Saturday:"שבת",Sunday:"ראשון"};
var MON={Jan:"בינואר",Feb:"בפברואר",Mar:"במרץ",Apr:"באפריל",May:"במאי",Jun:"ביוני",Jul:"ביולי",Aug:"באוגוסט",Sep:"בספטמבר",Sept:"בספטמבר",Oct:"באוקטובר",Nov:"בנובמבר",Dec:"בדצמבר"};
function dateFix(s){
 if(!/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\b/.test(s))return s;
 // "Sat, Nov 7" / "Sat Nov 7" / "Nov 7" / "Oct 31"
 var o=s.replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:day|sday|nesday|rsday|urday)?\b,?/g,function(m,d){return "יום "+DAYS[d]+","});
 o=o.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\b\s+(\d{1,2})\b/g,function(m,mo,dd){return dd+" "+MON[mo].replace(/^ב/,"ב")});
 o=o.replace(/,\s*,/g,",").replace(/,\s*(\d)/g,", $1").replace(/,$/,"");
 return o;
}

/* ---------- patterns ---------- */
function ord(n){return n}
var P=[
 [/^(.+) \(you\)$/,function(m){return m[1]+" (אתם)"}],
 [/^Buy (.+) for (\d+) coins\?$/,function(m){return "לקנות "+m[1]+" ב-"+m[2]+" מטבעות?"}],
 [/^🎉 (.+) is yours!$/,function(m){return "🎉 "+m[1]+" שלכם!"}],
 [/^Something went wrong: (.*)$/,function(m){return "משהו השתבש: "+m[1]}],
 [/^Comments \((\d+)\)$/,function(m){return "תגובות ("+m[1]+")"}],
 [/^(\d+)m ago$/,function(m){return "לפני "+m[1]+" דק'"}],
 [/^(\d+)h ago$/,function(m){return "לפני "+m[1]+" שע'"}],
 [/^(\d+)d ago$/,function(m){return "לפני "+m[1]+" ימים"}],
 [/^Could not post the comment\. ?(.*)$/,function(m){return "לא ניתן היה לפרסם את התגובה. "+m[1]}],
 [/^Spot #(\d+)$/,function(m){return "מקום #"+m[1]}],
 [/^Your top 20 fighters of all time\. (\d+) of (\d+) filled\. Other players can see your list on your profile\.$/,function(m){return "20 הלוחמים הטובים בכל הזמנים שלכם. "+m[1]+" מתוך "+m[2]+" מולאו. שחקנים אחרים יכולים לראות את הרשימה בפרופיל שלכם."}],
 [/^now #(\d+)$/,function(m){return "כרגע #"+m[1]}],
 [/^Add "(.+)"$/,function(m){return "הוספת \""+m[1]+"\""}],
 [/^(\d+) fighters?$/,function(m){return m[1]+" לוחמים"}],
 [/^(\d+) picks?$/,function(m){return m[1]+" בחירות"}],
 [/^(\d+) of (\d+) picked$/,function(m){return "נבחרו "+m[1]+" מתוך "+m[2]}],
 [/^(\d+) of (\d+) correct$/,function(m){return m[1]+" מתוך "+m[2]+" נכונים"}],
 [/^round (\d)$/i,function(m){return "סיבוב "+m[1]}],
 [/^in round (\d)$/i,function(m){return "בסיבוב "+m[1]}],
 [/^R(\d)$/,function(m){return "סיבוב "+m[1]}],
 [/^(KO\/TKO|SUB|DEC) · R(\d)(.*)$/,function(m){return m[1]+" · סיבוב "+m[2]+m[3]}],
 [/^You're #(\d+) · (\d+) coins?$/,function(m){return "אתם במקום "+m[1]+" · "+m[2]+" מטבעות"}],
 [/^You're #(\d+)$/,function(m){return "אתם במקום "+m[1]}],
 [/^(\d+) coins?$/,function(m){return m[1]+" מטבעות"}],
 [/^\+(\d+) coins?$/,function(m){return "+"+m[1]+" מטבעות"}],
 [/^(.+) wins · (KO\/TKO|SUB|DEC)( · .*)?$/,function(m){return m[1]+" מנצח · "+m[2]+(m[3]||"")}],
 [/^(.+) wins$/,function(m){return m[1]+" מנצח"}],
 [/^Pick (.+)$/,function(m){return "בחירה: "+m[1]}],
 [/^Result: (.+)$/,function(m){return "תוצאה: "+m[1]}],
 [/^Setting an alarm for (.*)$/,function(m){return "מגדיר התראה ל"+m[1]}],
 [/^(.+) UFC career$/,function(m){return m[1]+" · קריירה ב-UFC"}],
 [/^(.+) · (.+weight|.+ Heavyweight)$/i,function(m){return m[1]+" · "+tw(m[2])}],
 [/^Picks lock (.+) \(5 hours before the fights\)$/,function(m){return "הבחירות ננעלות "+m[1]+" (5 שעות לפני הקרבות)"}],
 [/^Main card (.+) your time \((.+)\)$/,function(m){return "הקלף המרכזי "+m[1]+" לפי השעה שלכם ("+(m[2]==="official, ufc.com"?"רשמי, ufc.com":"הערכה")+")"}],
 [/^in (\d+)h (\d+)m$/,function(m){return "בעוד "+m[1]+" שעות ו-"+m[2]+" דקות"}],
 [/^in (\d+)m$/,function(m){return "בעוד "+m[1]+" דקות"}],
 [/^(\d+)h (\d+)m$/,function(m){return m[1]+"ש "+m[2]+"ד"}],
 [/^(\d+)m$/,function(m){return m[1]+"ד"}],
 [/^\+(\d+)$/,function(m){return "+"+m[1]}],
 [/^(\d+) (?:points?|pts)$/,function(m){return m[1]+" נקודות"}],
 [/^You haven't picked (\d+)( of \d+)?$/,function(m){return "לא בחרתם ב-"+m[1]+(m[2]?" מתוך "+m[2].slice(4):"")}]
];
function tw(s){var t=s.replace(/^(.+?) · ?/,"");return TM[s.toLowerCase()]||s}

/* ---------- translate ---------- */
var CACHE=Object.create(null);
function seg(t){
 if(!t)return t;
 if(Object.prototype.hasOwnProperty.call(X,t))return X[t];
 var l=t.toLowerCase();
 if(Object.prototype.hasOwnProperty.call(TM,l))return TM[l];
 for(var i=0;i<P.length;i++){var m=P[i][0].exec(t);if(m)return P[i][1](m)}
 return t;
}
function core(s){
 if(Object.prototype.hasOwnProperty.call(X,s))return X[s];
 if(/·|, /.test(s)){
  var sp=/·/.test(s)?/(\s*·\s*)/:/(,\s+)/,ch=false;
  var o=s.split(sp).map(function(p,i){if(i%2)return p;var q=part(p.trim());if(q!==p.trim()){ch=true;return q}return p});
  if(ch)return o.join("");
 }
 return part(s);
}
function part(s){
 var r=seg(s);if(r!==s)return r;
 var d=dateFix(s);if(d!==s)return d;
 return s;
}
function tr(s){
 if(!s||!/[A-Za-z]/.test(s))return s;
 var m=/^(\s*)([\s\S]*?)(\s*)$/.exec(s);if(!m[2])return s;
 var k=m[2].replace(/\s+/g," ");
 var c=CACHE[k];
 if(c===undefined){c=core(k);CACHE[k]=c}
 if(c===k)return s;
 var lead=m[1],trail=m[3];
 if(c.charAt(0)==="~"){c=c.slice(1);lead=""}
 if(c.charAt(c.length-1)==="~"){c=c.slice(0,-1);trail=""}
 return lead+c+trail;
}
window.trHe=tr;

var ATTR=["placeholder","aria-label","title","alt"];
function doNode(n){
 if(n.nodeType===3){
  var p=n.parentNode;if(!p||p.nodeName==="SCRIPT"||p.nodeName==="STYLE"||p.nodeName==="TEXTAREA"||(p.closest&&p.closest("[translate=no]")))return;
  var v=tr(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v;return;
 }
 if(n.nodeType!==1)return;
 var tag=n.nodeName;if(tag==="SCRIPT"||tag==="STYLE")return;
 for(var i=0;i<ATTR.length;i++){var a=ATTR[i];if(n.hasAttribute&&n.hasAttribute(a)){var ov=n.getAttribute(a),nv=tr(ov);if(nv!==ov)n.setAttribute(a,nv)}}
 for(var c=n.firstChild;c;c=c.nextSibling)doNode(c);
}
var busy=false;
var mo=new MutationObserver(function(list){
 if(busy)return;busy=true;
 try{
  for(var i=0;i<list.length;i++){
   var r=list[i];
   if(r.type==="characterData")doNode(r.target);
   else if(r.type==="attributes")doNode(r.target.nodeType===1?r.target:r.target.parentNode);
   else for(var j=0;j<r.addedNodes.length;j++)doNode(r.addedNodes[j]);
  }
 }finally{busy=false}
});
function start(){
 fixH1();doNode(document.body);
 mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTR});
}
/* dialogs the browser shows */
var _al=window.alert,_cf=window.confirm;
window.alert=function(m){return _al.call(window,tr(String(m)))};
window.confirm=function(m){return _cf.call(window,tr(String(m)))};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
