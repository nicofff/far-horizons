export function log(s,title,text,kind='normal'){
  s.events.unshift({day:s.day,title,text,kind});
  s.events=s.events.slice(0,100);
}
