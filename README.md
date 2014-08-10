javascript-api
==============


# Usage

Some browsers do not support well parsing of ISO dates. In this case including the two following lines is recommended:

```
<script src="isodate.js" />
<script src="ibisense.core-latest.js" />
```
If the library will be used in IE browsers, json polyfills may be also needed. You can use 
either **json2.js** or **json3.js** libraries:
```
<script src="//cdnjs.cloudflare.com/ajax/libs/json3/3.3.0/json3.min.js" />
```

# Testing

```
URL="base url, e.g. https://ibi.io/v1/" API_KEY="YOUR API KEY" OWNER="YOUR USER NAME" mocha --reporter list tests
```
