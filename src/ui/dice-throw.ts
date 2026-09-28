/** B안 원본 HTML의 WAAPI 프레임·타이밍. CSS 구간별 easing으로 바꾸지 않는다. */
export function diceThrowPlan(face: number, variant: 0 | 1, speed: number) {
  const poses: Record<number, [number, number]> = {1:[0,0],2:[0,-90],3:[-90,0],4:[90,0],5:[0,90],6:[0,180]};
  const [x,y] = poses[face] ?? poses[1], sign = variant === 0 ? -1 : 1;
  const duration = 1700 / speed, delay = variant * 85 / speed;
  const end = `rotateX(${x}deg) rotateY(${y}deg)`;
  return {
    end,
    flight: {
      frames: [
        {transform:`translate(${sign*30}px,-25px) scale(.86)`,offset:0},
        {transform:`translate(${sign*12}px,-78px) scale(1.05)`,offset:.24},
        {transform:'translate(0,0) scale(1.08,.91)',offset:.61},
        {transform:'translate(0,-24px) scale(1)',offset:.74},
        {transform:'translate(0,0) scale(1.025,.97)',offset:.87},
        {transform:'translate(0,-4px)',offset:.93},
        {transform:'translate(0,0)',offset:1}
      ],
      options: {duration,delay,easing:'cubic-bezier(.22,.6,.35,1)',fill:'backwards' as const}
    },
    cube: {
      frames: [{transform:`rotateX(${x+720}deg) rotateY(${y+sign*360}deg)`},{transform:end}],
      options: {duration:duration*.94,delay,easing:'cubic-bezier(.15,.55,.24,1)',fill:'backwards' as const}
    },
    shadow: {
      frames: [{opacity:.25,transform:'scale(.65)'},{opacity:.65,transform:'scale(1.12)',offset:.65},{opacity:1,transform:'scale(1)'}],
      options: {duration,delay,fill:'backwards' as const}
    }
  };
}

export function animateDiceThrow(root: HTMLElement, faces: [number,number], speed: number): Animation[] {
  const animations: Animation[]=[];
  root.querySelectorAll<HTMLElement>('.dice-overlay .throwing').forEach((slot,index) => {
    const plan=diceThrowPlan(faces[index],index as 0|1,speed);
    const cube=slot.querySelector<HTMLElement>('.dice')!;
    cube.style.transform=plan.end;
    for (const [selector,part] of [['.dice-flight',plan.flight],['.dice',plan.cube],['.dice-shadow',plan.shadow]] as const) {
      const element=slot.querySelector<HTMLElement>(selector);
      if (typeof element?.animate === 'function') animations.push(element.animate(part.frames,part.options));
    }
  });
  return animations;
}
