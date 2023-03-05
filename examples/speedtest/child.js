/** @format */

import { IMPRESS } from './impress/impress.min.js';

const template = /*html*/ `
<div class="child">
	<h1 i-event={"click":"propChange"}>Child of i-app {props.section.index}</h1>
	<input class="text-centre" type="text" value={props.testdata} i-event={"change":"changeValue"}>	
</div>
<style>
.child {
	display:flex;
	flex-direction: column;
	justify-content: center;
	margin-right: 10px;
}

.flex-centre {
	display: flex;
	justify-content: center;
	flex-wrap: wrap;
	margin: 20px;
}

.text-centre{
	text-align: center;
}

input {
	border: 2px var(--infoColor) solid;
	border-radius: 10px;
	font-size: 75%;	
	padding: 10px;
	margin: 20px 0px;
	background-color: var(--dynamicCol);
}
h1 {
	margin-bottom: 0.5em;
	font-size: 125%;
}
</style>
`;

class ICHILD extends IMPRESS {
	constructor(node) {
		super(node);
		this.name = 'i-child';
		this.data = {
			section: {index: 'hello'},
			test: 'BAR',
			testdata: 'THIS IS INTERNAL DATA',
			title: 'titletest',
			col: 'green'			
		};
		this.template = template;		
	}
	changeValue($e) {
		let value = $e.target.value;
		this.iSetState(['props', 'testdata'], value);
	}
	propChange($e) {
		this.iSetState(['props', 'section', 'index'], `FOO - ${Math.round(Math.random() * 100)}`);
		let stateObject = this.iGetState(['props', 'section', 'index']);
		console.log(stateObject);
	}
}
export const child = IMPRESS.register(ICHILD);