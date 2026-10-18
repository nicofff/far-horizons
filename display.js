export async function createDisplay(canvas,frame,{forceCanvas=false,onBackend=()=>{}}={}){
  canvas.width=frame.width;canvas.height=frame.height;
  let device,context,texture,bindGroup,pipeline;
  if(!forceCanvas&&navigator.gpu){
    try{
      const adapter=await navigator.gpu.requestAdapter();
      if(adapter){
        device=await adapter.requestDevice();context=canvas.getContext('webgpu');
        if(!context)throw new Error('WebGPU canvas context unavailable');
        const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
        const shader=device.createShaderModule({code:`
          @group(0) @binding(0) var image: texture_2d<f32>;
          @vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
            var points = array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
            return vec4f(points[i],0,1);
          }
          @fragment fn fs(@builtin(position) p: vec4f) -> @location(0) vec4f {
            return textureLoad(image,vec2i(p.xy),0);
          }
        `});
        pipeline=device.createRenderPipeline({layout:'auto',vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
        texture=device.createTexture({size:[frame.width,frame.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
        bindGroup=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:texture.createView()}]});
        let active=true;
        device.lost.then(()=>{active=false;fallback('WebGPU device lost');});
        onBackend('WebGPU');
        return {backend:'WebGPU',present(){if(!active)return;try{device.queue.copyExternalImageToTexture({source:frame},{texture},[frame.width,frame.height]);const encoder=device.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(pipeline);pass.setBindGroup(0,bindGroup);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);}catch{active=false;fallback('WebGPU presentation failed');}}};
      }
    }catch{
      device?.destroy();
      if(context)return fallback('WebGPU initialization failed');
    }
  }
  return useCanvas(canvas);

  function useCanvas(target){const ctx=target.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;onBackend('Canvas 2D');return {backend:'Canvas 2D',present(){ctx.drawImage(frame,0,0);}};}
  function fallback(reason){
    const replacement=canvas.cloneNode(true);canvas.replaceWith(replacement);canvas=replacement;
    const display=useCanvas(canvas);canvas.dispatchEvent(new CustomEvent('display-replaced',{bubbles:true,detail:{canvas,display,reason}}));return display;
  }
}
