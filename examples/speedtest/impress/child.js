/** @format */

import IMPRESS from './impress.js';

const template = /*html*/ `
<div class="child">
	<h1>Child of i-app {props.item}</h1>
	<input class="text-centre" type="text" value={props.testdata} i-event={"change":"changeValue($e,$c)"}>
</div>
`;

let data = () => {
	return {
		testData: 'foo'
	};
};

const methods = {
	changeValue: ($e, $c) => {
		let value = $e.target.value;
		$c.setState(value, 'props.testdata');
	}	
};

export const child = IMPRESS.create('i-child', template, data, methods);
