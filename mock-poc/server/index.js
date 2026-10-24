import { app } from './app.js';

const port=Number(process.env.PORT||4174);
app.listen(port,'127.0.0.1',()=>console.log(`BHSS POC API listening at http://127.0.0.1:${port}`));
