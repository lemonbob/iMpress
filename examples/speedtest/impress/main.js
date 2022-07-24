/** @format */

import IMPRESS from './impress.js';
import {child} from './child.js';

let template = /*html*/ `
<h1 class="header">{data.title} custom elements <em>{data.performance}</em><strong> framework</strong> demonstration</h1>
<div class="flex-centre">
	<input class="text-centre" type="text" value={data.inputvalue} i-event={"change": "changeValue"}>
</div>
<div class="flex-centre">Time : {data.time}</div>
<div class="flex-centre">
	<button style={data.style} i-event={"click":"addComponent(1)"}>Add 1 Child</button>
	<button style={data.style} i-event={"click":"addComponent(5)"}>Add 5 Children</button>
	<button style={data.style} i-event={"click":"addComponent(5000)"}>Add 5000 Children</button>
	<button style={data.style} i-event={"click":"removeComponent"}>Remove All</button>
	<button style={data.style} i-event={"click":"reverse"}>Reverse Test</button>
	<button style={data.style} i-event={"click":"append"}>Append Test</button>
	<button style={data.style} i-event={"click":"dataAccessTest"}>Data Access Test</button>
	<button style={data.style} i-event={"click":"methodCallTest"}>Method Call Test</button>	
</div>
<div class="flex-centre text-centre">Benefits of iMpress - wrapper for native HTML Custom Elements<br>
<br>&#10004; Uses native support, no Virtual DOM, no technical debt!
<br>&#10004; Data acess upto 400x faster than Vue3.
<br>&#10004; Method calls run upto 100x faster than Vue3.
<br>&#10004; Reactive data updates upto 1000x faster Vue3, and upto 25x faster than React.
<br>&#10004; Component creation upto 10x faster than React and faster than Vue2/Vue3.
<br>&#10004; Memory usage is a fraction of the size of React/Vue2/Vue3, typically 5-10 times smaller.
<br>&#10004; Component code length is more concise, upto 20% smaller codebase.
<br>&#10004; Props are handled correctly — as name transformed data maps, all props identify their source map aiding debugging.
<br>&#10004; Synchonous code/DOM interaction, no more waiting for "nextTick" or render.
<br>&#10004; Use async/await in life cycle methods — full control of creation/destruction timing.
<br>&#10004; Server-side and dynamic templates, native portal and slot support.
<br>&#10004; No need for eventbus/emits/context API/prop classes wrapping parent methods — use the in-built custom query engine.
<br>
<br>NO PROXYS, NO REACTIVE SETTERS (data Vuetation) — data models can be handled externally or using MVC methodology without problems.
</div>

<i-for class="children" array={data.componentArray} inputvalue={data.inputvalue}>
	<i-child class="test-class" child={props.array[i]} testdata={props.inputvalue}></i-child>
</i-for>	
`;
//TODO need to fix commented out sections of mark-up
//<i-child i-for="child of data.componentArray" testdata={data.inputvalue} groupAttributes="class='children'"></i-child>
//<i-for class="children" define="child of data.componentArray" component="i-child" testdata={data.inputvalue}></i-for>
const data = () => {
	return {
		title: 'iMpress',
		performance: 'light speed',
		inputvalue: 'test',
		style: 'margin-top:10px',
		time: '',
		testObj: [{value: 'DAVE'},{value: 'HAL'}],
		componentArray: []
	};
};

const methods = {
	addComponent: function(n){
		let newItems = new Array(n);
		let i = newItems.length;
		let currentLength = this.data.componentArray.length;
		while (i--) {
			newItems[i] = i + currentLength;
		}
		this.data.componentArray.push(...newItems);
		this.setState('data.componentArray');		
	},
	removeComponent: function(){
		this.data.componentArray = [];
		this.setState('data.componentArray');		
	},
	reverse: function(){
		this.data.componentArray.reverse();
		this.setState('data.componentArray');
	},
	append: function(){
		for (let i = 0; i < 4999; i++){
			let child = this.data.componentArray.splice(0,1);
			this.data.componentArray.push(...child);
		}
		this.setState('data.componentArray');
		//let iFor = this._impressInternal.iChildren[0];
		//for (let i = 0;i < 4999; i++){
		//	iFor._impressInternal.iNode.append(iFor._impressInternal.iNode.children[0]);
		//}			
	},
	changeValue: function($e){
		this.data.inputvalue = $e.target.value;
		this.setState('data.inputvalue');		
	},
	dataAccessTest: function(){
		let i = 1e6;
		let time = performance.now();
		while (i--) {
			let x = this.data.testObj.value;
		}
		time = performance.now() - time;
		let ops = ((1000 / time) * 2e6) / 1000000;
		this.data.time = `${time.toFixed(2)}ms -- ${Math.floor(ops)} million ops/s`;
		this.setState('data.time');
	},
	methodCallTest: function(){
		let i = 1e6;
		let time = performance.now();
		while (i--) {
			let x = this.testMethod();
		}
		time = performance.now() - time;
		let ops = ((1000 / time) * 2e6) / 1000000;
		this.data.time = `${time.toFixed(2)}ms -- ${Math.floor(ops)} million ops/s`;
		this.setState('data.time');
	},
	testMethod: function(){
		return 10;
	}
};

//DEFINITION
const impressDefinitionObject = {
	name: 'i-app',
	template: template,
	data: data,
	methods: methods
};

const iapp = IMPRESS.create(impressDefinitionObject);