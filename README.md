# iMpress Custom Element Wrapper/Framework

## Introduction

There are many frameworks available for supposedly assisting in web development, some are current, many have fallen from favour. The current most popular frameworks are ReactJS, Angular, VueJS - all of which use a Virtual DOM. Claims circulate the web about the virtues of the Virtual DOM. However, most of the claims are false. Many of the claims centre around avoiding repaints and supposedly batching updates to improve speed. The fact is that modern browsers already batch updates - called the render tree - browsers do this at high speed in native code. The claim that a Javascript difference engine can outperform native code is absurd. Indeed, independent tests have repeatedly shown that Virtual DOM based frameworks slow optimum web performance by a factor 20 - 100 fold. 

There was of course a time for these frameworks pre-ES6 (2015) when Javascript lacked performance and lacked unit build tools - modules - but the state of technology has moved on. Taking a performance hit of up to 100-fold because developers are coding using outdated tech is not ideal. The Virtual DOM was never a benefit; it was a programming requirement when these frameworks were originally coded. It was necessary to capture lifecycle events - create/mount/destroy/update etc - but these events are now native to HTML Custom Elements making a clumsy heavy weight Virtual DOM obsolete.   

So where does that leave frameworks? Frameworks only have one benefit, state management - making it easy to maintain the view with the model. However, with one-way data flow (immutable props) necessitating prop drilling, and other restrictions, a common consequence is that as software scales this supposed virtue becomes a hinderance. State management is actually poorly handled by existing frameworks in anything but the simplest of cases. Complex state management handlers such as Redux and Vuex have been required imposing restrictions and boiler plate on developers. More and more developers are suggesting the above frameworks should not be used, giants such as Netflix have gone to enormous expense to remove frameworks because of poor performance. GitHub removed JQuery and went framework free citing technical debt.  

iMpress is different - it is a high-speed lightweight wrapper for HTML Custom Elements. No need for build tools like Babel and Webpack, it has in-built advanced lightweight state management (coming soon) - known as Super Props - iMpress is a tool for rapid web development built the way frameworks were truly intended. It is up to 100 times faster than current frameworks, and makes use of HTML Custom Elements in ES6 modules. It is designed for efficiet state management and allows programmers the freedom to code in a technical debt free environment using modern Javascript.  

In engine terms, ReactJS, Angular, VueJS are steam powered monsters ... or even horse drawn carts - albeit with heavy backers and a large community - but isn't it time for a more modern approach, isn't it time we dumped Victorian ideas, such as the Virtual DOM, for lightspeed performance?

## iMpress


To use - 

1. create an ES6 module

2. import IMPRESS from "./impress.js";

3. declare a variable with the argument as the Custom Element tag you want to create (all Custom Elements must be hyphenated) and call the IMPRESS.create method: e.g. 
```
let iapp = IMPRESS.create("i-app");
```

4. set the data object e.g.
```
iapp.data = {
	title:"iMpress",
	stars:{performance:'light speed'},	
};
```
5. set the methods e.g.
```
iapp.methods.customMethod = function(){}
```
6. set the template as a string literal or import HTML file via AJAX e.g.
```
iapp.template = `<h1 class="my_class">{data.title} custom elements <em>high speed</em><strong> framework</strong> demonstration</h1>`
```

7. data is used in the HTML in curly braces either as attributes or content e.g.
```
{data.stars.performance}
```

8. methods are added as JSON attributes - duplicate events are allowed
```
i-event={"click":"customMethod($e,$component)"}
```

Four special arguments are allowed in event handler methods:

i. $e or $event for the event object

ii. $component for the component

iii. $parent for the component parent

9. Props are passed via React-like methods
```
<i-child nstars={data.stars.performance}></i-child>
```

10. Props are mutable and can be accessed via the object component.props e.g.
```
istar.methods.propsChange = function(e,component){
	component.props.nstars = e.target.value;
```
All props automatically link to their parent object and have dual-way binding - a change of prop affects parent and vice-versa

11. All components can be added or removed simply by adding or removing their Custom Element HTML tag - in the main HTML file simply add the app tag e.g 
```
<i-app></i-app> 
```
Or add components dynamically via DOM mentods within the methods or add to the template of the iapp module. (or whatever it is named).

12. All Custom Element components must be hyphenated e.g. my-app, shopping-cart, address-form etc.

## up to 100 times faster than ReactJS, VueJS and Angular
