# Social Media Feed

**Task**: Please make me a system design for a social media feed application that displays a list of feed posts created by the users and they are able to interact with the posts.

## 1. Requirement Exploration

### 1.1. What are the core features to be supported?

1. Browse feed containing posts created by the users.
2. Create a new post.
3. Like a post.

### 1.2. What kind of posts are supported?

Currenlty it's only a plain text are supported to be the content of a post.

### 1.3. What pagination UX should be used for the feed?

Infinite scrolling: more posts will be added when the user reaches the end of their feed (bottom).

### 1.4. Will the app be used on mobile devices?

Yes.

### 1.5. Is there any additional information?

This app will be used internally within the company (internal social media).

---

## 2. Architecture/High-level Design

![Architecture](architecture-design.png)

### Component Responsibility

- **Server**: Provides HTTP APIs to **fetch posts** and to **create new feed posts**.
- **Post Controller**: controls the flow of data within the application and makes network requests to the server. In **React**, may create a **custom hook** like `usePostController()`.
- **Client Store**: Stores data needed across the whole or parts of application like feed posts and users data.
- **Feed UI**: Displaying a list of feed posts and the UI for composing a new post.
  - **Feed Post**: Displaying a single `Post` component where the text-based content and a button to interact (Like) are being displayed.
  - **Post Composer**: A text input field for the users to write the post content, button `Cancel` to cancel the action, and button `Create` to create the new post.

---

## 3. Data Model

| Entity    | Source              | Belongs To       | Fields                                                           |
| --------- | ------------------- | ---------------- | ---------------------------------------------------------------- |
| `Feed`    | Server              | Feed UI          | `posts` (list of `Post`s) and `pagination` (pagination metadata) |
| `Post`    | Server              | Feed Post        | `id`, `created_time`, `content`, `author` (a `User`), `likes`    |
| `User`    | Server              | Client Store     | `id`, `username`, `password`, `email`, `name`, `profile_pic_url` |
| `NewPost` | User Input (client) | Post Composer UI | `content`                                                        |

---

## 4. Database

Based on the requirements mentioned in #1.5 above, this app will be used **internally within the company**. So, the users **won't be as big as Twitter**, Facebook, and Instagram which are used globally in the world.

Actually, there will be two type of DB to use: **SQL** and **NoSQL**

- **SQL**: for storing **users** data
- **NoSQL**: for storing **posts** data

I think there are another choices like **GraphDB** that will be suitable for social media app. However, I don't really know about it yet. So, let's just use **SQL** and **NoSQL** for now and talk about it later if we still have some more time. I am open to your suggestions about what database would be the best suited for the bigger version of this app.

### 4.1. `USER` Table in SQL

| Field                 | Type           | Null | Default | Extra       |
| --------------------- | -------------- | ---- | ------- | ----------- |
| `id`                  | `INT`          | -    | -       | Primary Key |
| `username`            | `VARCHAR(50)`  | -    | -       | Unique      |
| `password`            | `VARCHAR(100)` | -    | -       |             |
| `email`               | `VARCHAR(100)` | -    | -       | Unique      |
| `name`                | `VARCHAR(100)` | -    | -       |             |
| `profile_picture_url` | `VARCHAR(200)` | -    | -       |             |

### 4.2. `POST` Data Model NoSQL

```typescript
type Post = {
  id: number;
  content: string;
  created_time: number;
  author_id: number; // FK to `USER.id` in SQL
  likes: number[]; // contains the ID of users who like the post
};
```

## 5. Interface Definition (API)

### 5.1. General API Definition

| Source        | Destination | API Type   | Functionality                                              |
| ------------- | ----------- | ---------- | ---------------------------------------------------------- |
| Server        | Controller  | HTTP       | Fetch feed posts                                           |
| Controller    | Feed UI     | Javascript | Transfer the feed posts data to be displayed in the UI     |
| Controller    | Server      | HTTP       | Create a new post; like a post                             |
| Post Composer | Controller  | Javascript | Transfer new post content to be sent to the server         |
| Feed Post     | Controller  | Javascript | Transer new like/unlike on a post to be sent to the server |

### 5.2. HTTP API

| Description        | HTTP Method | Path                     | Request Body          |
| ------------------ | ----------- | ------------------------ | --------------------- | ----------- |
| Get the feed posts | `GET`       | `/posts`                 |                       |
| Create a new post  | `POST`      | `/posts`                 | `{ content: string }` |
| Like/unlike a post | `POST`      | `/posts/<post_id>/likes` | `{ action: "like"     | "unlike" }` |

### 5.3. Pagination

Instead of getting all the feed posts at once and display all of them on the UI, it is better to slice the posts into some parts using pagination. The question is what will be the most suitable approach to be used for the pagination? Let's find it out together!

The app we're going to develop is a social media feed app. Such app has two characteristics as below:

- Data **changes** occur **frequently** (i.e. new posts are created).
- No need to **"jump" into a specific group of posts** (like changing to a specific page in a data table).

Based on the characteristics above, we think the suitable approach is to use **Cursor-based Pagination**.

---

# References

This system design is created by following the example of [News Feed (e.g. Facebook)](https://www.greatfrontend.com/questions/system-design/news-feed-facebook) system design provided by [GreatFrontEnd](https://www.greatfrontend.com/).
