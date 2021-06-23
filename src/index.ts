import dotenv from 'dotenv';
import { PsnClient } from './psn/client';


function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


const main = async () => {
    dotenv.config();
    const npsso = process.env.PSN_NPSSO;
    if (!npsso) {
        throw new Error('Could not find PSN_NPSSO in the environment');
    }
    const client = new PsnClient(npsso);
    const friends = await client.getFriends();

    const active = true;
    while (active) {
        const presences = await client.getPresences(Object.keys(friends));
        for (const [accountId, online] of Object.entries(presences)) {
            console.log(friends[accountId] + ' is ' + (online ? 'online' : 'offline'));
        }
        console.log('');
        await sleep(15000);
    }


    // console.log("Emulated light strip");
    // console.log("");
    // for (let i = 0; i <= 255; i++) {
    //     process.stdout.cursorTo(0, 1);
    //     for (let c = 0; c <= 10; c++) {
    //         process.stdout.write(chalk.rgb(255, i, 0)('\u2022 '));
    //     }
    //     process.stdout.write('\n');
    //     await sleep(1);
    // }
};

main();
