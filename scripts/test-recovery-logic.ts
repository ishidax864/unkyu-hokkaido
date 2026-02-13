
function getRecoveryText(recoveryTime: number, currentTime: string) {
    const h = Math.round(recoveryTime);
    const currentHour = parseInt(currentTime.split(':')[0]);
    const remainingHoursData = 24 - currentHour;

    if (h >= remainingHoursData || h > 10) {
        return '終日運休の恐れあり';
    } else if (h > 0) {
        return `${h}時間後に運転再開の見込み`;
    } else {
        return 'まもなく運転再開の見込み';
    }
}

console.log('Test 1 (Morning, Short Delay): 08:00, 2h ->', getRecoveryText(2, '08:00'));
console.log('Test 2 (Morning, Long Delay): 08:00, 12h ->', getRecoveryText(12, '08:00'));
console.log('Test 3 (Night, Short Delay): 22:00, 3h ->', getRecoveryText(3, '22:00'));
console.log('Test 4 (Night, Long Resumption): 20:00, 5h ->', getRecoveryText(5, '20:00'));
