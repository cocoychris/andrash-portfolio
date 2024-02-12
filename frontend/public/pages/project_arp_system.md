# Automated Robot Platform (ARP)

![ARP Bot](/assets/default/images/items/arpBot.png)

## Introduction
[![Welcome to ARP](/images/welcome_800x600.png)](https://youtu.be/IO3-2_hz4XU)

The ARP system is an RPA (Robotic Process Automation) system designed to automate daily routine tasks typically performed by human staff.

I single-handedly designed and developed this full-stack project during my tenure as an Information System Senior Executive at BRAND'S Suntory Ltd., Taiwan Branch, from August 2019 to February 2023. The system is used internally by the company's employees to automate routine tasks such as data entry, extraction, processing, and report generation. It also integrates with the SAP ERP and CRM systems to automate tasks like data synchronization and migration.

Since these tasks are repetitive and follow a predictable pattern, they are excellent candidates for automation. ARP is a general-purpose RPA system that can automate any task that a computer system can perform.

It is not limited to a specific application or industry, as the automation process (referred to as a "Bot") can be customized to meet user needs. This customization is achieved by writing simple JavaScript code using the provided framework and API.

[▶️ Play Demo video](https://youtu.be/IO3-2_hz4XU)

## Unique Features
The system also has unique features that outperform other RPA systems on the market, such as Automation Anywhere and Power Automate. These features include:

- **Parallel bot execution**: Unlike most RPA systems, which can only run one bot at a time, ARP can run up to 20 bots simultaneously on a single server. This is made possible by the `non-blocking` asynchronous architecture and the `worker threads` feature of `Node.js`. The system can also run multiple web scraping bots in parallel using Puppeteer in headless mode. The only exception is desktop automation that requires mouse and keyboard input. However, most processes can be automated using web scraping or Node.js APIs, reducing the need for desktop automation. Furthermore, the system can still run other non-desktop bots in parallel while a desktop bot is running.

- **Dynamic bot triggering**: Users can trigger bots on demand at any time with a single click on a link, without the need for queuing. While most RPA systems can only run bots on a fixed schedule or trigger bots from a specific computer or server, ARP allows bots to be triggered from any computer within the company's network by simply clicking a trigger URL, similar to joining a Zoom meeting. This feature is available only to authorized users.

## Comprehensive Sub-systems
The system was composed of several sub-systems that worked together to provide a complete RPA solution. These sub-systems include:
- **User management system**: The system has a user management system that allows users to register, login, and reset their passwords. It also has a role-based access control system that allows administrators to assign different roles to users and restrict their access to certain bots and features.
- **Bot Management System**: The system includes a bot management feature that allows users to execute, schedule, and monitor bots. It offers real-time updates on bot execution status and logs. Additionally, if the bot is involved in web scraping or desktop automation, snapshots of each step of the bot execution process are provided.
- **Bot Scripting Framework and APIs**: The system includes a bot scripting framework and APIs that allow users to write JavaScript code to automate tasks. The framework and APIs are designed to be simple and easy to use, allowing users to automate tasks with minimal effort.
- **Web CLI System**: The system includes a web-based command-line interface that allows users to execute ARP system commands directly from a web browser. This is the only way to interact and operate the ARP system. All the graphical user interfaces are built on top of this interface. This interface allows for various actions on ARP, such as starting and stopping the system, executing bots, creating scheduled tasks, adding users, viewing logs, checking status of sub-systems, and more.
- **Mailing System**: The system incorporates a mailing feature that enables it to send emails to users when certain events occur, such as when a bot fails to execute or when a bot completes its execution successfully. This feature is also integrated with the Bot Scripting Framework and APIs, allowing users to send emails from their bots. The system queues the emails and sends them with a delay when dispatching in bulk to prevent overloading the mail server. Any emails that fail to send are stored and will be automatically dispatched when the connection is restored.
- **Task Scheduling System**: The system includes a task scheduling feature that enables users to schedule bots to run at specific times or on a recurring basis. Additionally, it can identify tasks that were not executed due to system downtime and run them once the system is back online.
- **Directory Management System**: The system includes a directory management feature that removes log files and temporary files generated by bots after a certain period of time which can be configured by each directory. This feature is essential for maintaining the system's performance and storage capacity.
- and more...

## Technologies used in this project
`Node.js`, `Express.js`, `RESTful API`, `EJS`, `jQuery`, `Puppeteer`, `Nut.js`, `PostgreSQL`, `MSSQL`.

## Outcomes
The project was a great success and has been used by the company for more than 2 years. It has become an essential tool for automating repetitive tasks across multiple departments.

## Demo Video
As I am unable to provide access to the system or disclose the proprietary source code, I have created a demo video that demonstrates how the system operates.

[![▶️ Play Demo Video](/images/arp_demo_video_cover.png)](https://youtu.be/IO3-2_hz4XU)