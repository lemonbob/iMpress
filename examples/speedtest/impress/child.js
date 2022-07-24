/** @format */

import IMPRESS from './impress.js';

const template = /*html*/ `
<div class="child">
	<h1 i-event={"click": "propChange"}>Child of i-app {props.child}</h1>
	<input class="text-centre" type="text" value={props.testdata} i-event={"change":"changeValue"}>
</div>
`;

const data = () => {
	return {
		testData: 'mike'
	};
};

const methods = {
	changeValue: function($e){
		let value = $e.target.value;
		//method maps the prop to the data property in the owner and sets the state
		this.setState('props.testdata', value);
	},
	propChange: function(){
		this.setState('props.child', 'hello');
	}	
};

//DEFINITION
const impressDefinitionObject = {
	name: 'i-child',
	template: template,
	data: data,
	methods: methods
};

export const child = IMPRESS.create(impressDefinitionObject);
