/** @format */

import { IMPRESS } from './impress/impress.min.js';
import { child } from './child.js';

let alphabet = 'abcdefghijklmnopqrstuvwxyz1234567890';
let testObj = {};
for (let i = 0; i < alphabet.length; i++) {
	for (let j = 0; j < alphabet.length; j++) {
		for (let k = 0; k < alphabet.length; k++) {
			let objKey = `${alphabet[i]}${alphabet[j]}${alphabet[k]}`;
			testObj[objKey] = { a: 'TEST' };
		}
	}
}

let template = /*html*/ `
<link href="css/app.css" rel="stylesheet" type="text/css">
<h1 i-event={"click": "changeColour"} class="header">{data.title} custom elements <em>{data.performance}</em><strong> framework</strong> demonstration</h1>
<div class="flex-centre">
	<input class="text-centre" type="text" value={data.inputvalue} i-event={"change": "changeValue"}>
</div>
<div class="flex-centre">Time : {data.time}</div>
<div class="flex-centre">
	<button i-event={"click":"addComponent(1)"}>Add 1 Child</button>
	<button i-event={"click":"addComponent(5)"}>Add 5 Children</button>
	<button i-event={"click":"addComponent(5000)"}>Add 5000 Children</button>
	<button i-event={"click":"removeComponent"}>Remove All</button>
	<button i-event={"click":"reverse"}>Reverse Test</button>
	<button i-event={"click":"append"}>Append Test</button>
	<button i-event={"click":"dataAccessTest"}>Data Access Test</button>
	<button i-event={"click":"methodCallTest"}>Method Call Test</button>	
</div>
<i-for class="children" let="section" of="{data.sections}">
	<i-child class="test-class" section={section} testdata={data.inputvalue}></i-child>
</i-for>
<style>
	* {
		--dynamicCol: {data.col};
	}
		
	input{
		background-color: var(--dynamicCol);
		color: {data.pen};
	}
</style>
`;

class IAPP extends IMPRESS {
	constructor(node) {
		super(node);
		this.name = 'i-app';
		this.template = template;
		this.data = {
			title: 'iMpress',
			performance: 'light speed',
			inputvalue: 'test',
			style: 'margin-top:10px',
			time: '',
			testObj: [{ value: 'DAVE' }, { value: 'HAL' }],
			sections: [],
			bigarray: new Array(1000000).fill('TEST'),
			bigobj: testObj,
			col: 'rgb(45, 201, 207)',
			pen: 'blue',
			superprop: {index: 'superprop'}
		};
		this.iDefine('isDebug', true);
	}
	addComponent(n) {
		let i = this.data.sections.length;
		let targetLength = i + n;
		while (i < targetLength) {
			this.data.sections.push({index: i, fields: new Array(2).fill('Mike')});
			i++;
		}
		let t = performance.now();
		this.iSetState(['data', 'sections']);
		console.log(performance.now() - t);
	}
	removeComponent() {
		this.data.sections = [];
		this.iSetState('data.sections');
	}
	reverse() {
		this.data.sections.reverse();
		this.iSetState('data.sections');
	}
	append() {
		for (let i = 0; i < 4999; i++) {
			let child = this.data.sections.splice(0, 1);
			this.data.sections.push(...child);
		}
		this.iSetState('data.sections');
	}
	changeValue($e) {
		this.data.inputvalue = $e.target.value;
		this.iSetState('data.inputvalue');
	}
	dataAccessTest() {
		let i = 1e6;
		let time = performance.now();
		while (i--) {
			let x = this.data.testObj.value;
		}
		time = performance.now() - time;
		let ops = ((1000 / time) * 2e6) / 1000000;
		this.data.time = `${time.toFixed(2)}ms -- ${Math.floor(ops)} million ops/s`;
		this.iSetState('data.time');
	}
	methodCallTest() {
		let i = 1e6;
		let time = performance.now();
		while (i--) {
			let x = this.testMethod();
		}
		time = performance.now() - time;
		let ops = ((1000 / time) * 2e6) / 1000000;
		this.data.time = `${time.toFixed(2)}ms -- ${Math.floor(ops)} million ops/s`;
		this.iSetState('data.time');
	}
	testMethod() {
		return 10;
	}
	changeColour() {
		let newColour = `rgb(${Math.round(Math.random() * 255)}, ${Math.round(Math.random() * 255)}, ${Math.round(Math.random() * 255)})`;
		this.iSetState(['data', 'col'], newColour);
	}
}

const iapp = IMPRESS.register(IAPP);