
import { splitStatusText } from '../lib/text-parser';

const text1 = "降雪および強風の影響により、一部列車に運休や遅れが出ています<BR>以下の区間で運転を見合わせていますなお函館線...";
const text2 = "大雪の影響により、終日運休となります。";
const text3 = "";

console.log("--- Test 1 ---");
console.log(splitStatusText(text1));

console.log("--- Test 2 ---");
console.log(splitStatusText(text2));

console.log("--- Test 3 ---");
console.log(splitStatusText(text3));
