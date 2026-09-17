import { TbHome, TbTags, TbWriting, TbMoodSmile } from 'react-icons/tb';
import type { StructureBuilder } from 'sanity/structure';

const BlogMenuItem = (S: StructureBuilder) =>
  S.listItem()
    .title('Blog')
    .icon(TbWriting)
    .child(() =>
      S.list()
        .title('Blog')
        .items([
          // All Posts
          S.listItem()
            .title('All Posts')
            .icon(TbWriting)
            .child(() =>
              S.documentTypeList('blogPost').title('All Posts').menuItems(S.documentTypeList('blogPost').getMenuItems())
            ),
          // Posts By Author
          S.listItem()
            .title('Posts By Author')
            .icon(TbWriting)
            .child(() =>
              S.documentTypeList('author')
                .title('Posts By Author')
                .child((authorId) =>
                  S.documentTypeList('blogPost').title('Posts').filter('$authorId == author._ref').params({ authorId })
                )
            ),
          // Posts By Category
          S.listItem()
            .title('Posts By Category')
            .icon(TbWriting)
            .child(() =>
              S.documentTypeList('blogPostCategory')
                .title('Posts By Category')
                .child((categoryId) =>
                  S.documentTypeList('blogPost')
                    .title('Posts')
                    .filter('$categoryId in categories[]._ref')
                    .params({ categoryId })
                )
            ),
          S.divider(),
          // Authors
          S.listItem()
            .title('Authors')
            .icon(TbMoodSmile)
            .child(() =>
              S.documentTypeList('author').title('Authors').menuItems(S.documentTypeList('author').getMenuItems())
            ),
          // Post Categories
          S.listItem()
            .title('Categories')
            .icon(TbTags)
            .child(() =>
              S.documentTypeList('blogPostCategory')
                .title('Categories')
                .menuItems(S.documentTypeList('blogPostCategory').getMenuItems())
            ),
          // Blog Landing Page
          S.listItem()
            .title('Blog Landing Page')
            .child(S.document().schemaType('blogLandingPage').documentId('blogLandingPage'))
            .icon(TbHome)
        ])
    );

export default BlogMenuItem;
