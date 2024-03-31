import express from 'express';
import bodyParser from 'body-parser';
import { runOogaLangCode } from './runOogaLang.js';
import cors from 'cors';
import debug from 'debug';

const log = debug('ooga:server');
const app = express();
const port = 3001; // Make sure this port is free or choose another

app.use(cors());
app.use(bodyParser.json());

interface RunRequest {
    code: string;
}

interface RunResponse {
    success: boolean;
    output?: string;
    error?: string;
}

app.post(
    '/run',
    async (req: express.Request<{}, {}, RunRequest>, res: express.Response<RunResponse>) => {
        try {
            const { code } = req.body;
            const output = await runOogaLangCode(code); // This will run the code and catch errors internally
            res.json({ success: true, output });
        } catch (error) {
            res.json({ success: false, error: error.message });
        }
    }
);

app.listen(port, () => {
    log(`Ooga-lang API server running at http://localhost:${port}`);
});
