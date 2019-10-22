
import { quintOut, cubicOut } from 'svelte/easing';

function vortex(node, {target, duration = 1000}) {
  const targetRect = target.getBoundingClientRect();
  const targetX = targetRect.x + targetRect.width / 2;
  const targetY = targetRect.y + targetRect.height / 2;
  
  const style = getComputedStyle(node);
  const transform = style.transform === 'none' ? '' : style.transform;

  const sourceRect = node.getBoundingClientRect();
  const sourceX = sourceRect.x + sourceRect.width / 2;
  const sourceY = sourceRect.y + sourceRect.height / 2;

  const prevX = parseInt(style.left) || 0;
  const prevY = parseInt(style.top) || 0;
  const deltaX = targetX - sourceX
  const deltaY = targetY - sourceY
  console.log('VORTEXING')
  return {
    duration,
    easing: cubicOut,
    css: t => {
      return `
        transform: translate(${deltaX*(1-t)}px, ${deltaY*(1-t)}px);
      `
    }
  }
}

export { vortex };