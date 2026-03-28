const DiseaseResultMedia = ({ image, leafImage, t }) => {
    if (!image && !leafImage) {
        return null;
    }

    return (
        <div className={`result-images-container ${image && leafImage ? 'dual-images' : 'single-image'}`}>
            {image && (
                <div className="image-wrapper">
                    <img src={image} alt="Plant overview" className="result-image" />
                    <span className="image-label">{t('results.plantPhoto')}</span>
                </div>
            )}
            {leafImage && (
                <div className="image-wrapper">
                    <img src={leafImage} alt="Leaf close-up" className="result-image" />
                    <span className="image-label">{t('results.leafPhoto')}</span>
                </div>
            )}
        </div>
    );
};

export default DiseaseResultMedia;
