export default async function handler(req,res){
  await fetch("https://YOUR-APP-NAME.vercel.app");
  res.json({ok:true});
}
