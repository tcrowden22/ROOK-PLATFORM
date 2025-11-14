import { useEffect, useState } from 'react';
import { Search, BookOpen, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { KnowledgeArticle } from '../lib/types';

export function KnowledgeBase() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<KnowledgeArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadArticles();
  }, []);

  useEffect(() => {
    filterArticles();
  }, [articles, searchTerm]);

  const loadArticles = async () => {
    try {
      const data = await api.kb.list();
      setArticles(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load articles:', error);
      setLoading(false);
    }
  };

  const filterArticles = () => {
    if (!searchTerm) {
      setFilteredArticles(articles);
      return;
    }

    const filtered = articles.filter(
      (article) =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredArticles(filtered);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading knowledge base...</div>;
  }

  if (selectedArticle) {
    return (
      <div>
        <button
          onClick={() => setSelectedArticle(null)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6"
        >
          <ArrowLeft size={20} />
          <span>Back to Articles</span>
        </button>

        <div className="bg-white rounded-xl shadow-sm p-8 max-w-4xl">
          <h1 className="text-3xl font-bold text-slate-800 mb-4">{selectedArticle.title}</h1>

          <div className="flex flex-wrap gap-2 mb-6">
            {selectedArticle.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="prose max-w-none">
            <div
              className="text-slate-700 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: selectedArticle.body.replace(/\n/g, '<br/>') }}
            />
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Last updated: {new Date(selectedArticle.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Knowledge Base</h1>
        <p className="text-slate-600 mt-1">Browse help articles and documentation</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="p-6">
          {filteredArticles.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500">No articles found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className="border border-slate-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <BookOpen className="text-blue-600" size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 mb-2">{article.title}</h3>
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {article.body.substring(0, 100)}...
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {article.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {article.tags.length > 3 && (
                      <span className="px-2 py-1 text-slate-500 text-xs">
                        +{article.tags.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
