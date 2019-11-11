<script>
	export let progress = 100;
	export let style = "fill:yellow"
	
	let x = 50
	let y = 50
	let r = 50
	let startAngle
	let endAngle = Math.PI/2 ;
	let startX;
	let startY;
	let endX;
	let endY;
	let largeArc;

	$: {
		if (progress > 100) progress = 100
		
	  startAngle = -progress/100 * Math.PI*2 + Math.PI/2 
	  if (startAngle <= endAngle) {
      startAngle += 0.001
    }
	  startX = x + Math.cos(startAngle) * r
	  startY = y - Math.sin(startAngle) * r
	 	
	  endX = x + Math.cos(endAngle) * r
	  endY = y - Math.sin(endAngle) * r
	  largeArc = endAngle - startAngle <= Math.PI ? 0 : 1;
  }
</script>

<style>
	svg {
		width: 100%;
		height: 100%;
	}
</style>

<svg viewBox="0 0 100 100" {style}>
	<path d="M {x} {y} L {startX} {startY} A {r} {r} 0 {largeArc} 0 {endX} {endY} L {x} {y}"></path>
</svg>