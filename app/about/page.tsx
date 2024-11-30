import styles from 'styles/Home.module.css'

export default function Page() {
    return (
        <main className={styles.main}>
            <div className="p-4">

            <div className={styles.title}>
                About SPS By The Numbers
            </div>

            <div className={styles.card}>
                This site was originally created in response to SPS's attempt to change the
                bell-times because of a supposed inability to staff bus routes. A number
                of parents threw together a survey and gathered over a thousand responses
                showing an overwhelming preference to keep the existing bell-time structure,
                even amongst families who still did not have service.

                The survey data needed a place to be displayed and thus sps-by-the-numbers.com
                was born.

                In addition to that survey, some other tools and data analyses for SPS were
                collated. The hope is this site will grow to be a respository for data-centric
                information on SPS.

                The site itself is fully opensource [on github](https://github.com/awong-dev/sps-by-the-numbers).

                For questions, email <a href="mailto:sps.by.the.numbers@gmail.com">sps.by.the.numbers@gmail.com</a>.

                If you wanna contribute ideas, posts, or just hang, join <a href="spsbythenumbers.slack.com
                ">spsbythenumbers.slack.com</a> using this <a href="https://join.slack.com/t/spsbythenumbers/shared_invite/zt-18zrdd0dh-HloXUNn4zgKR0ML3NeCFKg">invite link</a>.
            </div>
            <div className={styles.card}>
                <h3>Contributors (alphabetical by first name):</h3>
                <ul>
                    <li>Albert Wong</li>
                    <li>Amy Atwood</li>
                    <li>Beth Day</li>
                    <li>Christie Robertson</li>
                    <li>Jane Tunks Demel</li>
                    <li>Mark Verrey</li>
                    <li>Nancy White</li>
                    <li>Tara Chase</li>
                    <li>Yeechi Chen</li>
                </ul>
                </div>
            </div>
        </main>
    );
}
