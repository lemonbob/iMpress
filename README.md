# iMpress Custom Element Wrapper/Framework

## Introduction

There are many frameworks available for supposedly assisting in web development, some are current, many have fallen from favour. The current most popular frameworks are ReactJS, Angular, VueJS - all of which use a Virtual DOM. Claims circulate the web about the virtues of the Virtual DOM. However, most of the claims are false. Many of the claims centre around avoiding repaints and supposedly batching updates to improve speed. The fact is that modern browsers already batch updates - called the render tree - browsers do this at high speed in native code. The claim that a Javascript difference engine can outperform native code is absurd. Indeed, independent tests have repeatedly shown that Virtual DOM based frameworks slow optimum web performance by a factor up to 100-fold. 

There was a time for these frameworks pre-ES6 (2015) when Javascript lacked performance and lacked unit build tools - modules - but the state of technology has moved on. Taking a performance hit of up to 100-fold because developers are coding using outdated tech is not ideal. The Virtual DOM was never a benefit; it was a programming requirement when these frameworks were originally built. It was necessary to capture lifecycle events - create/mount/destroy/update etc - but these events are now native to HTML Custom Elements making a clumsy heavy weight Virtual DOM obsolete.   

So where does that leave frameworks? Frameworks only have one benefit, state management - supposedly making it easy to maintain the view with the model using a MVVM architecture. However, with project scaling is become quickly apparent that MVVM with reactive getters and setters causes more problems than it solves. State management is actually poorly handled by existing frameworks in anything but the simplest of cases. The Flux pattern evolved and Redux/Vuex were added to solve these issues, but caused even more problems and boiler plate. Netflix have gone to great expense to remove frameworks because of poor performance. GitHub removed JQuery and went framework free citing technical debt.

iMpress is different - it is a high-speed lightweight wrapper for HTML Custom Elements. iMpress is a tool for rapid web development built the way frameworks were truly intended - a View layer to be used with whatever data architecture or model, such as MVC, that meets the requirements of the platform. It is up to 400 times faster than Vue 3, and makes use of HTML Custom Elements in ES6 modules. It is designed for efficiet state management and allows programmers the freedom to code in a technical debt free environment using modern Javascript. Benefits of iMpress are:

Uses native support, no Virtual DOM, no more technical debt!
Data acess upto 400x faster than Vue3 and other frameworks.
Method calls run upto 100x faster than Vue3 and other frameworks.
Component creation/destruction as fast as the fastest frameworks.
Memory usage is a fraction of the size of other frameworks, typically 5-10 times smaller.
Component code length is more concise, upto 20% smaller codebase.
Props are handled correctly and are truly immutable.
Synchonous code, no more waiting for "nextTick" or components to mount.
Use async in your life cycle methods, if desired.
Server-side and dynamic templates.
No need for eventbus/emits/context API/sending class props — use the in-built custom query engine.
NO PROXYS, NO REACTIVE SETTERS (data Vuetation) — data models can be handled externally or using MVC methodology without problems.

In engine terms, ReactJS, Angular, VueJS are steam powered monsters ... or even horse drawn carts - albeit with heavy backers and a large community - but isn't it time for a more modern approach? Isn't it time we dumped old ideas, such as the Virtual DOM, for lightspeed performance? Instead new releases of outdated tech, essentially polished coal, iMpress has been designed to provide a truly up to date solution.

## iMpress


To use - 

1. create an ES6 module

2. import IMPRESS from "./impress.js";

3. set the data object either an object or function return are fine e.g.
```
data = {
   title:"iMpress"		
};
```
4. set the methods e.g.
```
methods = {
   customMethod: () => {
   //your code
   }
```
5. set the template as a string literal or import HTML file via AJAX e.g.
```
template = `<h1 class="my_class">{data.title} custom elements <em>high speed</em><strong> framework</strong> demonstration</h1>`
```

6. declare a variable with the argument as the Custom Element tag you want to create (all Custom Elements must be hyphenated) and call the IMPRESS.create method, passing in the template, data and methods as parameters (or defined as arguments): e.g. 
```
let iapp = IMPRESS.create("i-app", template, data, methods);
```

7. data is used in the HTML in curly braces either as attributes or content e.g.
```
{data.stars.performance}
```

8. methods are added as JSON strings in an i-event attribute - duplicate events are allowed in the JSON string
```
i-event={"click":"customMethod($e,$component)"}
```

Four special arguments are allowed in event handler methods:

i. $e or $event for the event object

ii. $c or $component for the component

9. Props are passed via React-like methods
```
<i-child title={data.title}></i-child>
```

10. Props are not mutable. They exist only as namespaces for the child component to access the true owner of the data. Props when properly conceived are not local data, nor should they ever be so. To modify a prop, internally a propsMap contains data references to the true owner of the data, a setState method on each component can be used to request mutation.
```
$c.setState(value, 'props.title');
```
All props automatically link to their parent object and due to the method call are interally tracked meaning no more contrived usage of class props to pass mutation methods throughout a system.

11. All components can be added or removed simply by adding or removing their Custom Element HTML tag. No more contrived solutions such as portals, just add a tag where you want anywhere in the DOM. Everything is tracked, every component has a guid, it can be traced, used, and removed simply by requesting the component object.
```
<i-app></i-app> 
```

12. All Custom Element components must be hyphenated e.g. my-app, shopping-cart, address-form etc. All methods exist on the object base, not as class instance methods. Consequently memory usage is a fraction the size of most frameworks. Methods receive the component instance as a parameter in order to access data and update state, this results in extremely fast performance.

## up 400 times faster than ReactJS, Vue and Angular
