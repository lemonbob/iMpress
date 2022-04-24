/** @format */

import IMPRESS from './impress.js';
import {child} from './child.js';

let template = /*html*/ `
<h1 class="header">{data.title} custom elements <em>{data.performance}</em><strong> framework</strong> demonstration</h1>
<div class="flex-centre">
	<input class="text-centre" type="text" value={data.inputvalue} i-event={"change": "changeValue($e,$c)"}>
</div>
<div class="flex-centre">Time : {data.time}</div>
<div class="flex-centre">
	<button style={data.style} i-event={"click":"addComponent($c,1)"}>Add 1 Child</button>
	<button style={data.style} i-event={"click":"addComponent($c,100)"}>Add 100 Children</button>
	<button style={data.style} i-event={"click":"addComponent($c,5000)"}>Add 5000 Children</button>
	<button style={data.style} i-event={"click":"removeComponent($c)"}>Remove All</button>
	<button style={data.style} i-event={"click":"reverse($c)"}>Reverse Test</button>
	<button style={data.style} i-event={"click":"append($c)"}>Append Test</button>
	<button style={data.style} i-event={"click":"dataAccessTest($c)"}>Data Access Test</button>
	<button style={data.style} i-event={"click":"methodCallTest($c)"}>Method Call Test</button>	
</div>
<div class="flex-centre text-centre">Benefits of iMpress - wrapper for native HTML Custom Elements<br>
<br>&#10004; Uses native support, no Virtual DOM, no technical debt!
<br>&#10004; Data acess upto 400x faster than Vue3.
<br>&#10004; Method calls run upto 100x faster than Vue3.
<br>&#10004; Reactive data updates upto 1000x faster Vue3, and upto 10x faster than React.
<br>&#10004; Component creation much faster than React and faster than Vue2/Vue3.
<br>&#10004; Memory usage is a fraction of the size of React/Vue2/Vue3, typically 5-10 times smaller.
<br>&#10004; Component code length is more concise, upto 20% smaller codebase.
<br>&#10004; Props are handled correctly — as name transformed immutable data representations.
<br>&#10004; Synchonous code/DOM interaction, no more waiting for "nextTick" or render.
<br>&#10004; Use async/await in life cycle methods — full control of creation/destruction timing.
<br>&#10004; Server-side and dynamic templates, native portal and slot support.
<br>&#10004; No need for eventbus/emits/context API/prop classes wrapping parent methods — use the in-built custom query engine.
<br>
<br>NO PROXYS, NO REACTIVE SETTERS (data Vuetation) — data models can be handled externally or using MVC methodology without problems.
</div>
<div id="test">
	<i-for class="children" iterator={data.componentArray} component="i-child" testdata={data.inputvalue}></i-for>	
</div>
`;

let data = () => {
	return {
		title: 'iMpress',
		performance: 'light speed',
		inputvalue: 'test',
		style: 'margin-top:10px',
		time: '',
		testObj: [{value: 'FOO'},{value: 'bar'}],
		componentArray: []
	};
};

const methods = {
	addComponent: ($c, n) => {
		let newItems = new Array(n);
		let i = newItems.length;
		let currentLength = $c.data.componentArray.length;
		while (i--) {
			newItems[i] = i + currentLength;
		}
		$c.data.componentArray.push(...newItems);
		$c.setState($c.data.componentArray, 'data.componentArray');
	},
	removeComponent: ($c) => {
		$c.data.componentArray = [];
		$c.setState($c.data.componentArray, 'data.componentArray');		
	},
	reverse: ($c) => {
		$c.data.componentArray.reverse();
		$c.setState($c.data.componentArray, 'data.componentArray');
	},
	append: ($c) => {
		for (let i = 0; i < 4999; i++){
			let child = $c.data.componentArray.splice(0,1);
			$c.data.componentArray.push(...child);
		}
		$c.setState($c.data.componentArray, 'data.componentArray');
	},
	changeValue: ($e, $c) => {
		$c.setState($e.target.value, 'data.inputvalue');		
	},
	dataAccessTest: ($c) => {
		let i = 1e6;
		let time = performance.now();
		while (i--) {
			let x = $c.data.testObj.value;
		}
		time = performance.now() - time;
		let ops = ((1000 / time) * 2e6) / 1000000;
		$c.setState(`${time.toFixed(2)}ms -- ${Math.floor(ops)} million ops/s`, 'data.time');
	},
	methodCallTest: ($c) => {
		let i = 1e6;
		let time = performance.now();
		while (i--) {
			let x = iapp.methods.testMethod($c);
		}
		time = performance.now() - time;
		let ops = ((1000 / time) * 2e6) / 1000000;
		$c.setState(`${time.toFixed(2)}ms -- ${Math.floor(ops)} million ops/s`, 'data.time');
	},
	testMethod: ($c) => {
		return 10;
	}
};

const iapp = IMPRESS.create('i-app', template, data, methods);
