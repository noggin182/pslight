import chalk from 'chalk';

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const main = async () => {
    console.clear();
    console.log("Emulated light strip");
    console.log("");
    for (let i = 0; i <= 255; i++) {
        process.stdout.cursorTo(0, 1);
        for (let c = 0; c <= 10; c++) {
            process.stdout.write(chalk.rgb(255, i, 0)('\u2022 '));
        }
        process.stdout.write('\n');
        await sleep(1);
    }
};

main();
