[« return to the patterns overview](../index.md)

# Resource Patterns

Resource events are essential to any non-trivial LaxarJS application, as they allow to share application resources and to collaborate on them.
Because events are always delivered _by copy_, there is no danger of widgets and activities performing conflicting operations on shared mutable state.


## The Master/Slave Pattern

When using the LaxarJS resource pattern, for a given resource there is usually a single widget (or activity) responsible for _providing_ it, in order for others to collaborate.
If applicable, that widget (the _resource master_) is also capable of persisting modifications to the resource.
The other collaborators are _slaves_ with respect to the shared resource.

Only the resource master may change the _identity_ of a shared resource, while the slaves may only publish _modifications to the state_ of the resource.

### Example: Shopping Cart

As an example, consider a shopping cart widget that displays a list of _positions_ (articles and quantities) in a web shop application.
The user may select any of the positions, and a second widget will then show details on the _selected-position_ resource, such as a photo of the corresponding article.
The shopping cart widget is the resource master here, because it alone determines which article is currently selected.
The details widget is a slave, it can only act with respect to the currently selected article.

The details widget might even allow to modify the quantity of a given article within the cart, causing the shopping cart to remove a position when its quantity reaches zero.
However, the slave can never change _which_ position is currently the _selected-position_ .

### The _didReplace_ and _didUpdate_ Events

The identity and initial state of a resource is published through the _didReplace_ event by the resource master.
Modifications to a resource may be published through the _didUpdate_ event, by master or slaves.

Event name                 | Payload Attribute | Type   | Description
---------------------------|-------------------|--------|-------------------------------------------------------------
`didReplace.{resource}`    |                   |        | _published by a resource master to define state and identity of a shared resource_
                           | `resource         | string | the topic through which the resource is shared (used in the payload _as well as_ in the event name)
                           | `data`            | object | the (initial or new) state of the resource
`didUpdate.{resource}`     |                   |        | _published by a resource master or by its slaves to publish modifications to the state of a shared resource_
                           | `resource`        | string | _see above_
                           | `patches`         | array  | A [JSON-Patch](https://tools.ietf.org/html/rfc6902) document (an array representing a sequence of incremental modifications)

Because modifications _(didUpdate)_ are transmitted incrementally, the resource master may use the `patches` attribute of the event payload to persist modifications using an [HTTP PATCH](http://tools.ietf.org/html/rfc5789) request.
To create and apply patches, you require `laxar_patterns` into your widget controller and use `createPatch` and `applyPatch` from the `laxar_patterns.json` API.

When sharing resources, keep in mind that resource events (like all LaxarJS events) are cloned for each receiver.
This makes it easy to write robust applications, but can lead to inefficiencies if very large resources are published.
In some cases, it might be worthwhile to factor out sub-resources relevant to the consumers.


## Asynchronous Resource Validation

Often the individual widgets sharing a resource know best how to validate their specific user input.
However, in the context of persistence or navigation the validity state of the overall resource or of the entire page is of interest.

Widgets and activities concerned with navigation and persistence should not be exposed to the details of resource validation [1].
To separate these concerns, widgets may issue _requests to validate a resource_ which other widgets may respond to.
Respondents may choose to validate immediately or asynchronously.

### The _validateRequest, willValidate_ and _didValidate_ Events

A widget may request validation of a resource using a `validateRequest` event.
Collaborators capable of performing validation on this resource respond by publishing a `willValidate` event.
After they have performed validation, possibly asynchronously, collaborators publish a `didValidate` event.

Event name                   | Payload Attribute | Type   | Description
-----------------------------|-------------------|--------|------------------------------------------------------------
`validateRequest.{resource}` |                   |        | _published by any widget that requires validation of the given resource_
                             | `resource`        | string | the topic through which the resource is shared (used in the payload _as well as_ in the event name)
`willValidate.{resource}`    |                   |        | _published by a widget that is about to perform validation of the given resource_
                             | `resource`        | string | _see above_
`didValidate.{resource}`     |                   |        | _published by a widget that has performed validation of the given resource_
                             | `resource`        | string | _see above_
                             | `outcome`         | string | One of `ERROR`, `WARNING`, `INFO` and `SUCCESS`
                             | `data`            | array  | A list of _validation messages_ for the application user (see below)

### Validation Outcome and Validation Messages

The `didValidate` event contains information on the results of a validation:

  * The _outcome_ determines if validation was successful:

      + `ERROR`: The resource is in an invalid state. If the receiver would normally persist the resource, it will probably not do so.
      + `WARNING`: The resource _probably_ contains problems. If the receiver would normally persist the resource, it should probably obtain user confirmation before doing so.
      + `INFO`: The resource _might_ contain problems or require user intervention. If the receiver would normally persist the resource, it might obtain confirmation or otherwise inform the user.
      + `SUCCESS`: No problems were found _by the sender_ of the event. If the receiver would normally persist the resource, it should proceed as far as the sender is concerned.

  * The _validation messages_ (`data` array) contains additional details for the user. Each message is an object with at least these attributes:

      + `htmlMessage`: A validation message for the user (a _string_), to be interpreted as HTML markup
      + `level`: The severity of this particular vaidation message (a _string_), using the outcomes specified above
      + `sortKey`: The message priority (a _string_) that should be used for sorting messages lexicographically.

[1]: As an exception to this rule, a resource master may perform a (semantic) _overall_ validation after the individual editor widgets had their say.


## Saving Resources

Usually the resource master is responsible for saving user input where appropriate.
This can be achieved by performing a REST call for example, or by putting state into a container resource (as a slave) and requesting for the container to be persisted.

### The _saveRequest, willSave_ and _didSave_ Events

To request saving a resource, widgets may publish a `saveRequest` event.
Widgets capable of and configured for persisting the resource respond by publishing a `willSave` event.
After they have ensured persistence, usually asynchronously, collaborators publish a `didSave` event.

Event name                   | Payload Attribute | Type   | Description
-----------------------------|-------------------|--------|------------------------------------------------------------
`saveRequest.{resource}`     |                   |        | _published by any widget that requires persisting the given resource_
                             | `resource`        | string | the topic through which the resource is shared (used in the payload _as well as_ in the event name)
`willSave.{resource}`        |                   |        | _published by a widget that is about to persist the given resource_
                             | `resource`        | string | _see above_
`didSave.{resource}`         |                   |        | _published by a widget after saving the given resource_
                             | `resource`        | string | _see above_
                             | `outcome`         | string | `ERROR` or `SUCCESS`

The `didSave` event contains information on the _outcome_:

  * `ERROR`: The resource could not be saved. The sender should also publish a `didEncounterError` event in this case.
  * `SUCCESS`: The resource was saved successfully.

Depending on the use case, widgets might persist resources automatically every time they have been modified.
In this case, it is recommended for them to still respond to save requests, for best interoperability.
