# Goal

Build a web app that can be hosted in github page OR cloudflare page using VueJS. It will be served to users as pre rendered.


# App purpose

I want this app to be an easy place for people to manage their house rennovation project.

Ideally they will:
- create a project
- upload the architurale plan (an image). An example is provided in the /img/plan.png.
- It will look and analyse the image to retrieve the wall and room name if possible. Feel free to use a FREE AI model.
- User can then draw a line indicating the distance in cm. That will allow to create a scale for each of the plan, room, wall size.
- User can then select a wall and be able to move it, rescale it, or delete it.
- User can add a new wall and that can then be edited.
- User can upload a new image (example a furniture) and move it around. 
- There is basically 2 main view; the main canvas, and the control panel on the right side which is used to display information about things that are selected.
- You can put a top menu (just like a software) on the top, in full width.
- I do NOT want to have any user management mechanism. Everything is managed directly in the web for now.
- Image uploaded can be added to a upload folder within the project for now. 
- I only want to run it locally for now.



# Menu
The menu will contain the buttons to perform the action describe above.


# Instructions
Before you do something, if you are not sure ask me first. Feel free to make suggestion about component, libraries to use.
