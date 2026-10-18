export function createSimulationLoop(step,{
  idle,hidden=()=>document.hidden,now=()=>performance.now(),
  requestFrame=callback=>requestAnimationFrame(callback),cancelFrame=id=>cancelAnimationFrame(id),
  setTimer=(callback,delay)=>setTimeout(callback,delay),clearTimer=id=>clearTimeout(id),
  foregroundInterval=0,
}){
  let last=now(),frame=null,timer=null,wasHidden=hidden(),wasIdle=idle();
  function cancel(){if(frame!==null)cancelFrame(frame);if(timer!==null)clearTimer(timer);frame=timer=null;}
  function schedule(){
    wasIdle=idle();
    if(hidden()){
      if(!wasIdle)timer=setTimer(()=>tick(now()),1000);
    }else if(wasIdle)timer=setTimer(()=>tick(now()),250);
    else if(foregroundInterval>0)timer=setTimer(()=>tick(now()),foregroundInterval);
    else frame=requestFrame(tick);
  }
  function tick(time){
    frame=timer=null;const background=hidden(),elapsed=Math.max(0,(time-last)/1000);
    // Background timers can be throttled; use elapsed time rather than counting callbacks.
    const seconds=wasIdle?0:wasHidden||background?elapsed:Math.min(.15,elapsed);
    last=time;wasHidden=background;step(seconds,time);
    if(frame===null&&timer===null)schedule();
  }
  return {
    wake(){
      if(wasIdle)last=now();
      if(timer!==null){clearTimer(timer);timer=null;}
      if(frame===null){if(!hidden())frame=requestFrame(tick);else schedule();}
    },
    visibilityChanged(){cancel();tick(now());},
    stop:cancel,
  };
}
