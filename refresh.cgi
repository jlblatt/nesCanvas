#!/usr/bin/perl

# refresh.cgi
#
# Get updated stats from browser for user, store them, and send back channel data
#

use CGI qw(:standard);

print "Content-type: text/html\n\n";

if(param()) {

    #Write params to a file in json format - this makes it easy to send back to the browser
    $chanName = param('chan');
    $nickName = param('name');

    my $jsonOut = 
	'{
	    "name" : "' . param('name') . '",
	    "spr" : "' . param('spr') . '",
	    "x" : ' . param('x') . ',
	    "y" : ' . param('y') . ',
	    "dx" : ' . param('dx') . ',
	    "dy" : ' . param('dy') . ',
	    "ax" : ' . param('ax') . ',
	    "ay" : ' . param('ay') . ',
	    "sx" : ' . param('sx') . ',
	    "sy" : ' . param('sy') . ',
	    "rot" : ' . param('rot') . ',
	    "facing" : "' . param('facing') . '",
	    "currAction" : "' . param('currAction') . '"	
	    }';

    open(FILE , "> channels/$chanName/$nickName.ncu") or die("refresh.cgi error - file write error");
    print FILE $jsonOut;
    close(FILE);
}

else {
    die("refresh.cgi error - no parameters");
    #$chanName = "narshe";
}


#Now we have to send back info for all others in this channel

print '{ "Sprite": [ ';

@files = `ls -1 channels/$chanName/*.ncu`;

#Don't return user's own stats, they are done locally
#Remove user's own file from list
for($i = 0 ; $i < @files ; $i++) {
    if($files[$i] =~ /\/$nickName\.ncu/) {
	splice(@files,$i,1);
    }
}

foreach $userFile (@files) {

#    if( !($userFile =~ /\/$nickName\.ncu/) ) {
	open(FILE , "< $userFile") or die("refresh.cgi error - file read error");

	while ($line = <FILE>) {
	    print $line;
	}
    
	close(FILE);

	#Print a comma after all entries except the last
	if($userFile eq $files[-1]) { }
	else {
	    print " ,";
	}

#    }
}
	  
print ' ] ';  #end array of sprites

#do we have messages to deliver to this user?
my $msgFile = "channels/$chanName/$nickName.ncm";
if( -s "$msgFile" ) {
    print ' , "Messages": [ ';

    open(FILE , "< $msgFile") or die("refresh.cgi error - file read error");
    while ($line = <FILE>) {
	#Data is stored in JSON format alread
	print $line;
    }
    close(FILE);
    
    #Delete file once all the msgs have been extracted
    system("rm $msgFile");

    print ' ] ';  #end msgs   
}

print ' } ';  #end JSON object
