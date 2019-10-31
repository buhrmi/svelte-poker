<script>
	export let progress = 0;
	export let style = "fill:yellow"

	
	let x = 50
	let y = 50
	let r = 50
	let startAngle
	let endAngle = 0 ;
	let startX;
	let startY;
	let endX;
	let endY;
	let largeArc;
	
	$: {	
	 startAngle = -progress/100 * 2 * Math.PI + Math.PI/2 
	
	 startX = x + Math.cos(startAngle) * r
	 startY = y - Math.sin(startAngle) * r
	 endX = x + Math.cos(endAngle) * r
	 endY = y - Math.sin(endAngle) * r
	 largeArc = endAngle - startAngle <= Math.PI ? 0 : 1;
    if (startAngle > endAngle) {
      var s = startAngle;
      startAngle = endAngle;
      endAngle = s;
    }
    
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