## ConfigView

AREPL automatically evaluates python code in real-time as you type.

AREPL is availible for free on the vscode [marketplace](https://marketplace.visualstudio.com/items?itemName=Allent.config-view#overview).

## Usage

First, make sure you have [python 3.7 or greater](https://www.python.org/downloads/) installed.

Install the python package `mmconfig` through:
```shell
pip install mmconfig
```

Open a python file and click on the cat ![cat](./media/happy_cat_24.png)  in the top bar to the right to open AREPL. You can click the cat again to close.

Or run AREPL through the command search: `control-shift-p`

or use the shortcuts: `control-shift-a` (current doc) / `control-shift-q` (new doc)

## Features

* Real-time evaluation: no need to run - AREPL evaluates your code automatically. You can control this (or even turn it off) in the settings.

* Variable display: The final state of your local variables are displayed in a collapsible JSON format.

* Error display: The instant you make a mistake an error with stack trace is shown.

* Settings: AREPL offers many settings to fit your user experience.  Customize the look and feel, debounce time, python options, and more!
