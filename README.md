# iMpress Custom Element Wrapper/Framework

To use - 

1) create an ES6 module

2) import IMPRESS from "./impress.js";

3) declare a variable with the argument as the Custom Element tag you want to create (all Custom Elements must be hyphenated: e.g. 
let iapp = IMPRESS.create("i-app");

4) set the data object e.g.
iapp.data = {
	title:"iMpress",
	stars:{performance:1000},	
};

5) set the methods e.g.
iapp.methods.customMethod = function(){}

6) set the template as a string literal (or AJAX import) e.g.
iapp.template = 

```
<h1 class="my_class">{data.title} custom elements <em>high speed</em><strong> framework</strong> demonstration</h1>
```

7) data is used in the HTML in curly braces either as attributes or content e.g.
{data.stars.performance}

8)methods are added as JSON attributes - duplicate events are allowed
i-event={"click":"customMethod($e,$component,$props)"}

four special arguments are allowed in event handler methods:
i)$e or $event for the event object
ii)$component for the component
iii)$parent for the component parent

9)props are passed via React-like methods
<i-child nstars={data.stars.performance}></i-child>

10)props are mutable and can be accessed via the object component.props e.g.

istar.methods.propsChange = function(e,component){
	component.props.nstars = e.target.value;

All props automatically link to their parent object and have dual-way binding - a change of prop affects parent and vice-versa

11)All components can be added or removed simply by adding or removing their Custom Element DOM tag

12)All Custom Element components must be hyphenated e.g. my-app

20-100 times faster than ReactJS, VueJS and Angular
