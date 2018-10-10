# Learning Journal for Articulate Rise

The Learning Journal allows a learner of an Articulate Rise course to enter text responses to journal prompts throughout a Rise module. At the end of the module, the learner can print their learning journal of all their responses. The responses are saved to the browser so that they persist on future visits to the Rise course. 

## Use

### Edit the Rise Course

For detailed instructions on how to add the Learning Journal to the Rise course, see the [HOW-TO](https://github.com/mikeamelang/learning-journal/raw/master/Learning%20Journal%20HOW-TO.docx).

### Add the Learning Journal files

After outputting the Rise course into Web format, the following two files must be included alongside the index.html file of the Rise course:
* Learningjournal.js
* Learningjournal.css

### Edit the index.html

These two files must be linked in the index.html by including the following three lines in the <head> of the index.html file of the Rise course:
  
```
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
<link type="text/css" rel="stylesheet" href="learningjournal.css">
<script src="learningjournal.js"></script>
```

## Notes

The formatting can be customized by using the Learningjournal.css file.
