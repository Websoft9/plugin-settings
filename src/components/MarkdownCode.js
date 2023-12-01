import 'highlight.js/styles/github.css';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

const MarkdownCode = ({ markdown }) => {
    return (
        <ReactMarkdown
            rehypePlugins={[rehypeRaw, rehypeHighlight]}
        >
            {markdown}
        </ReactMarkdown>
    );
};

export default MarkdownCode;
