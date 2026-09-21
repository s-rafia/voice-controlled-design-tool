"""
Builds commands.csv for the voice-controlled design tool intent classifier.

Schema: phrase,label  -- "phrase" is what the user speaks, "label" is the
command it maps to. Note this differs from the v1 dataset, which used
"text": the training code must reference df['phrase'] accordingly.

All phrases are lowercase with no punctuation, because that is what the
Web Speech API hands back from a live microphone.
"""

import csv

COMMANDS = {}

# ---------------------------------------------------------------- viewport

COMMANDS["PAN"] = [
    "pan the canvas to the left",
    "pan the canvas right",
    "move the canvas up",
    "move the canvas down a bit",
    "shift the canvas over to the left",
    "scroll the canvas down",
    "drag the canvas to the right",
    "pan up a little",
    "pan down",
    "move the view to the left",
    "shift the view right",
    "slide the canvas over",
    "pan across to the right side",
    "move the whole canvas up",
    "scroll over to the left",
    "push the canvas down",
    "pan the board up slightly",
    "move the artboard view down",
    "shift the workspace to the left",
    "pan the canvas up",
]

COMMANDS["ZOOM_IN"] = [
    "zoom in",
    "zoom in a little",
    "zoom in closer",
    "zoom in on this",
    "i want a closer look at this",
    "give me a closer look",
    "give me a tighter view of this",
    "narrow the view",
    "make the view narrower",
    "zoom in two hundred percent",
    "magnify this",
    "zoom in on the selection",
    "tighten the view",
    "increase the zoom",
    "zoom in more",
    "bring me closer to this",
    "make everything look bigger on screen",
    "get closer to the canvas",
]

COMMANDS["ZOOM_OUT"] = [
    "zoom out",
    "zoom out a bit",
    "zoom out more",
    "give me a wider view",
    "give me a broader look of this",
    "i want a wider view of this",
    "widen the view",
    "make the view broader",
    "pull back from the canvas",
    "back out a little",
    "decrease the zoom",
    "zoom out to fifty percent",
    "show me more of the canvas",
    "make everything look smaller on screen",
    "give me more room to see",
    "broaden the view",
    "reduce the zoom level",
    "step back from the canvas",
]

COMMANDS["ZOOM_FIT"] = [
    "fit everything on screen",
    "zoom to fit",
    "fit the whole design in the view",
    "fit all of it on screen",
    "fit the canvas to the window",
    "show the entire artboard",
    "zoom to fit all",
    "fit everything in the window",
    "fit the frame to the screen",
    "show me the whole design",
    "fit the selection to the screen",
    "zoom so i can see everything",
    "fit the page on screen",
    "bring everything into view",
    "fit the whole board",
    "show all of it at once",
    "fit the artboard in the window",
    "scale the view to fit everything",
]

COMMANDS["ZOOM_RESET"] = [
    "reset the zoom",
    "zoom to one hundred percent",
    "actual size",
    "go back to actual size",
    "reset the view",
    "set the zoom to one hundred",
    "back to normal zoom",
    "show it at real size",
    "reset the zoom level",
    "default zoom please",
    "put the zoom back to normal",
    "view at actual size",
    "one hundred percent zoom",
    "return to the normal view",
    "normal size view",
    "restore the original zoom",
    "zoom back to default",
    "set the view to actual size",
]

# --------------------------------------------------------------- selection

COMMANDS["SELECT_ALL"] = [
    "select all",
    "select everything",
    "select everything on the canvas",
    "highlight everything",
    "select all the layers",
    "choose everything on this page",
    "select all objects",
    "pick everything",
    "select the whole canvas",
    "select all elements",
    "i want everything selected",
    "select every layer",
    "mark everything",
    "select all of it",
    "select all items on the artboard",
    "grab everything on the board",
    "select the entire canvas",
    "select all layers at once",
]

COMMANDS["DESELECT"] = [
    "deselect",
    "deselect everything",
    "clear the selection",
    "unselect all",
    "never mind the selection",
    "drop the selection",
    "deselect all of it",
    "nothing selected please",
    "clear what is selected",
    "cancel the selection",
    "let go of the selection",
    "unselect everything",
    "remove the selection",
    "deselect this",
    "empty the selection",
    "forget the selection",
    "clear selection please",
    "deselect all layers",
]

COMMANDS["SELECT_BY_COLOR"] = [
    "select the blue ones",
    "select all red boxes",
    "highlight the green shapes",
    "choose all yellow boxes",
    "grab everything that is purple",
    "select the orange shapes",
    "select blue only",
    "pick all the red ones",
    "select everything green",
    "get all the yellow shapes",
    "select all the purple boxes",
    "grab the orange ones",
    "select all blue shapes",
    "i want the red ones selected",
    "highlight all green boxes",
    "select everything that is yellow",
    "choose the purple shapes",
    "select the orange ones please",
    "select all the black shapes",
    "select every white element",
]

COMMANDS["SELECT_BY_TYPE"] = [
    "select all the text layers",
    "select every text box",
    "select all the images",
    "grab all the rectangles",
    "select all the circles",
    "choose all the frames",
    "select every line",
    "select all the groups",
    "highlight all the text",
    "select all image layers",
    "pick all the shapes",
    "select every rectangle on the page",
    "select all the icons",
    "grab all the text elements",
    "select all vector layers",
    "choose every image",
    "select all the buttons",
    "select every frame on the canvas",
]

COMMANDS["ADD_TO_SELECTION"] = [
    "add this one to the selection",
    "also select this one",
    "include this shape too",
    "add that to what is selected",
    "select this one as well",
    "add this layer to the selection",
    "keep this selected too",
    "and this one too",
    "add the circle to the selection",
    "also grab this one",
    "include that in the selection",
    "select this one in addition",
    "add one more to the selection",
    "also include the blue box",
    "add that shape as well",
    "extend the selection to this one",
    "throw this one in too",
    "add this to what i already have selected",
]

# --------------------------------------------------------------- transform

COMMANDS["MOVE_OBJECT"] = [
    "move this shape to the left",
    "move the selected shape right",
    "nudge it up",
    "nudge this down a little",
    "move it to the right a bit",
    "shift this shape up",
    "move the box down",
    "push this to the left",
    "move the selection up ten pixels",
    "slide this shape to the right",
    "move this element down",
    "drag this up a bit",
    "move the rectangle left",
    "nudge the selection right",
    "move it up slightly",
    "shift the selected layer down",
    "move this shape over to the left",
    "reposition this a little higher",
]

COMMANDS["RESIZE"] = [
    "make this shape bigger",
    "make this shape smaller",
    "resize this to be larger",
    "shrink this shape",
    "scale this up",
    "scale it down",
    "make the box twice as big",
    "make this rectangle wider",
    "make this taller",
    "reduce the size of this shape",
    "increase the size of the selection",
    "resize the frame to be smaller",
    "enlarge this shape",
    "make this element narrower",
    "scale the selection up by twenty percent",
    "shrink the image a little",
    "make this half the size",
    "stretch this shape wider",
]

COMMANDS["ROTATE"] = [
    "rotate this ninety degrees",
    "turn this shape clockwise",
    "rotate it to the left",
    "spin this around",
    "rotate the box forty five degrees",
    "turn this counterclockwise",
    "rotate this a little to the right",
    "tilt this shape",
    "rotate the selection one eighty",
    "turn the image upside down",
    "rotate this back to zero",
    "angle this shape slightly",
    "rotate everything selected",
    "turn this ninety degrees right",
    "rotate the text",
    "spin the icon clockwise",
    "rotate this by ten degrees",
    "straighten this shape out",
]

COMMANDS["FLIP"] = [
    "flip this horizontally",
    "flip it vertically",
    "mirror this shape",
    "flip the image left to right",
    "flip this upside down",
    "mirror the selection horizontally",
    "flip this across the vertical axis",
    "reverse this shape horizontally",
    "flip the icon",
    "mirror it the other way",
    "flip this top to bottom",
    "flip the whole group horizontally",
    "mirror this layer vertically",
    "flip that one over",
    "make a mirror image of this",
    "flip the arrow around",
    "flip vertical",
    "flip horizontal",
]

# ------------------------------------------------------- layers and order

COMMANDS["BRING_FORWARD"] = [
    "bring this shape forward",
    "move this layer up one level",
    "bring it to the front",
    "put this on top",
    "raise this layer",
    "move this in front of the other one",
    "bring this forward one step",
    "send this to the front",
    "move this up in the layer order",
    "put this above the rest",
    "bring the text in front of the image",
    "raise this to the top",
    "move this layer forward",
    "bring this up a level",
    "layer this on top",
    "push this shape forward",
    "bring this to the very front",
    "move this one layer up",
]

COMMANDS["SEND_BACKWARD"] = [
    "send this shape backward",
    "move this layer down one level",
    "send it to the back",
    "put this behind the others",
    "lower this layer",
    "move this behind the image",
    "send this back one step",
    "push this to the back",
    "move this down in the layer order",
    "put this underneath",
    "send the rectangle behind the text",
    "drop this to the bottom layer",
    "move this layer backward",
    "send this down a level",
    "layer this underneath",
    "send this to the very back",
    "tuck this behind the others",
    "move this one layer down",
]

COMMANDS["GROUP"] = [
    "group these together",
    "group the selected shapes",
    "put these in a group",
    "combine these into one group",
    "group them",
    "make these a group",
    "group everything selected",
    "bundle these together",
    "group these two shapes",
    "wrap these in a group",
    "group the selection",
    "turn these into a group",
    "join these into a group",
    "group all of the selected layers",
    "put all of these together in one group",
    "group this set of shapes",
    "make a group out of these",
    "group them up",
]

COMMANDS["UNGROUP"] = [
    "ungroup this",
    "ungroup these shapes",
    "break this group apart",
    "split this group up",
    "separate these shapes",
    "ungroup the selection",
    "take this group apart",
    "release this group",
    "break these apart",
    "dissolve the group",
    "ungroup everything",
    "unbundle these shapes",
    "separate the grouped layers",
    "split this into individual shapes",
    "remove the group",
    "ungroup that one",
    "break up this group",
    "take these out of the group",
]

COMMANDS["LOCK_LAYER"] = [
    "lock this layer",
    "lock this shape so it does not move",
    "lock the background",
    "freeze this layer",
    "lock the selection",
    "unlock this layer",
    "unlock the background",
    "lock all the text layers",
    "make this layer uneditable",
    "lock this in place",
    "unlock everything",
    "lock these shapes",
    "keep this layer from moving",
    "unlock the selected layer",
    "lock the frame",
    "lock this so i do not move it by accident",
    "unlock the image layer",
    "toggle the lock on this layer",
]

COMMANDS["TOGGLE_VISIBILITY"] = [
    "hide this layer",
    "show this layer",
    "hide the background",
    "make this shape invisible",
    "unhide the text layer",
    "hide the selected shapes",
    "show the hidden layers",
    "turn off the visibility of this layer",
    "hide the image",
    "make this visible again",
    "hide everything except this",
    "show all layers",
    "hide that one for now",
    "reveal this layer",
    "toggle visibility on this shape",
    "hide the top layer",
    "show the bottom layer",
    "make this layer show up again",
]

# ----------------------------------------------------------------- editing

COMMANDS["DUPLICATE"] = [
    "duplicate this shape",
    "make a copy of this",
    "copy this one",
    "duplicate the selection",
    "clone this shape",
    "make another one of these",
    "duplicate this layer",
    "give me a copy of this box",
    "duplicate these three times",
    "make a duplicate right next to it",
    "replicate this shape",
    "duplicate everything selected",
    "create a copy of this frame",
    "make two more of these",
    "duplicate that one",
    "copy this element",
    "make a duplicate",
    "clone the selected layers",
]

COMMANDS["DELETE"] = [
    "delete this shape",
    "remove this layer",
    "delete the selection",
    "get rid of this",
    "erase this shape",
    "delete these",
    "remove the selected shapes",
    "throw this away",
    "delete that box",
    "clear this element off the canvas",
    "remove all of the selected layers",
    "delete this text",
    "get rid of that one",
    "wipe this shape out",
    "delete everything selected",
    "remove this image",
    "take this off the canvas",
    "delete the frame",
]

COMMANDS["UNDO"] = [
    "undo that",
    "undo the last thing",
    "go back one step",
    "undo",
    "take that back",
    "revert the last change",
    "undo my last action",
    "that was wrong undo it",
    "step back one action",
    "undo the last two steps",
    "reverse that change",
    "cancel what i just did",
    "undo please",
    "roll that back",
    "undo the last edit",
    "i did not mean that undo it",
    "back up one action",
    "undo what i just did",
]

COMMANDS["REDO"] = [
    "redo that",
    "redo the last action",
    "put it back",
    "redo",
    "bring that change back",
    "never mind redo it",
    "redo what i undid",
    "step forward one action",
    "reapply that change",
    "redo the last two steps",
    "go forward one step",
    "redo please",
    "restore that change",
    "redo my last undo",
    "bring back the last edit",
    "reverse the undo",
    "redo the change i undid",
    "move forward one action",
]

# ------------------------------------------------------------- arrangement

COMMANDS["ALIGN"] = [
    "align these to the left",
    "align the selected shapes to the right",
    "center these horizontally",
    "align them along the top",
    "align these to the bottom",
    "center this on the canvas",
    "line these up on the left edge",
    "align the text to the center",
    "center these vertically",
    "align everything to the middle",
    "line up these boxes along the top",
    "align this shape to the center of the frame",
    "align the selection left",
    "put these in a straight line on the right",
    "center the group horizontally",
    "align these along their bottom edges",
    "line this up with the top edge",
    "center everything on the artboard",
]

COMMANDS["DISTRIBUTE"] = [
    "distribute these evenly",
    "space these out equally",
    "distribute the selection horizontally",
    "spread these apart evenly",
    "even out the spacing between these",
    "distribute these vertically",
    "make the gaps between these equal",
    "space these boxes evenly across",
    "distribute them with equal spacing",
    "give these the same spacing",
    "spread these out horizontally",
    "even spacing between the shapes please",
    "distribute the selected layers vertically",
    "equalize the gaps",
    "space these apart the same amount",
    "distribute evenly across the frame",
    "put equal space between these",
    "even out the distance between these shapes",
]

# ---------------------------------------------------------------- creation

COMMANDS["CREATE_SHAPE"] = [
    "draw a rectangle",
    "add a circle",
    "create a square here",
    "make a new rectangle",
    "draw a line",
    "add an ellipse",
    "insert a triangle",
    "create a rounded rectangle",
    "draw a box on the canvas",
    "add a new shape",
    "make a circle in the middle",
    "draw a small square",
    "insert a rectangle here",
    "create a line across",
    "add a frame",
    "draw an arrow",
    "make a new ellipse",
    "put a rectangle on the artboard",
]

COMMANDS["CREATE_TEXT"] = [
    "add a text box",
    "insert some text here",
    "create a text layer",
    "add a heading",
    "write some text on the canvas",
    "put a label here",
    "add a title",
    "insert a text field",
    "create a new text element",
    "add text to this frame",
    "make a text box here",
    "type something here",
    "add a caption",
    "insert a paragraph of text",
    "put some words on the canvas",
    "add a text layer on top",
    "create a headline",
    "new text box please",
]

# ----------------------------------------------------------------- styling

COMMANDS["SET_FILL_COLOR"] = [
    "make this blue",
    "change the fill to red",
    "fill this shape with green",
    "set the color to yellow",
    "make this shape purple",
    "change this to orange",
    "color this box black",
    "make the background white",
    "set the fill color to light blue",
    "paint this shape green",
    "change the fill of this to pink",
    "make this one gray",
    "turn this shape red",
    "give this a blue fill",
    "change the color of the text to white",
    "fill it with dark green",
    "set this shape color to teal",
    "recolor this to yellow",
]

COMMANDS["SET_OPACITY"] = [
    "make this fifty percent transparent",
    "lower the opacity of this shape",
    "set the opacity to twenty percent",
    "make this more transparent",
    "increase the opacity",
    "make this shape fully opaque",
    "fade this out a bit",
    "drop the opacity down",
    "make this see through",
    "set the transparency to seventy five percent",
    "reduce the opacity of the image",
    "make this less transparent",
    "turn the opacity all the way up",
    "make this slightly faded",
    "set this layer to thirty percent opacity",
    "make the background more see through",
    "raise the opacity a little",
    "bring the opacity down to ten percent",
]


# ------------------------------------------------------------ held-out set
# Phrases that appear nowhere in training. Weighted toward the confusable
# pairs, so test accuracy reflects generalisation rather than memorisation.

EVAL = {
    "PAN": ["move the canvas to the right", "scroll the board up a little"],
    "ZOOM_IN": ["let me see this up close", "zoom right in on that"],
    "ZOOM_OUT": ["i need a broader view", "back off a little from the canvas"],
    "ZOOM_FIT": ["fit it all in the window", "show me everything at once"],
    "ZOOM_RESET": ["put the zoom back to one hundred", "go back to real size"],
    "SELECT_ALL": ["grab every layer", "select the lot"],
    "DESELECT": ["clear everything i selected", "unselect that"],
    "SELECT_BY_COLOR": ["select all the pink ones", "grab every green box"],
    "SELECT_BY_TYPE": ["select all the ellipses", "grab every image layer"],
    "ADD_TO_SELECTION": ["add the red square too", "also take this one"],
    "MOVE_OBJECT": ["move this box up a little", "nudge the selected shape left"],
    "RESIZE": ["make the circle much bigger", "shrink this down a bit"],
    "ROTATE": ["turn this thirty degrees", "rotate the shape the other way"],
    "FLIP": ["mirror this image horizontally", "flip that shape over vertically"],
    "BRING_FORWARD": ["move this shape up one layer", "bring this in front of the box"],
    "SEND_BACKWARD": ["move this shape down one layer", "put this behind the circle"],
    "GROUP": ["group all of these", "put these three together"],
    "UNGROUP": ["split these back apart", "undo this grouping"],
    "LOCK_LAYER": ["lock the bottom layer", "unlock this shape"],
    "TOGGLE_VISIBILITY": ["hide the second layer", "make the image visible again"],
    "DUPLICATE": ["give me another one of these", "duplicate this box twice"],
    "DELETE": ["delete this circle", "get rid of the selected shapes"],
    "UNDO": ["take back that last change", "undo the last thing i did"],
    "REDO": ["redo the thing i just undid", "put that change back"],
    "ALIGN": ["line these up on the right", "center this in the frame"],
    "DISTRIBUTE": ["spread these evenly across", "make the spacing between them equal"],
    "CREATE_SHAPE": ["draw a big circle here", "put a square on the canvas"],
    "CREATE_TEXT": ["add some text here", "create a title text box"],
    "SET_FILL_COLOR": ["make this one dark blue", "change the fill to light gray"],
    "SET_OPACITY": ["make this sixty percent transparent", "fade the image a little"],
}


def write_csv(path, mapping):
    rows = [(text, label) for label, texts in mapping.items() for text in texts]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["phrase", "label"])
        w.writerows(rows)
    return rows


if __name__ == "__main__":
    train_rows = write_csv("commands.csv", COMMANDS)
    eval_rows = write_csv("hard_eval.csv", EVAL)
    print(f"commands.csv   : {len(train_rows)} rows across {len(COMMANDS)} labels")
    print(f"hard_eval.csv  : {len(eval_rows)} rows across {len(EVAL)} labels")
